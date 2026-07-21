import pino from 'pino';

import { prisma } from '../../config/database';
import { runDetached } from '../../shared/utils/background';
import { isUniqueViolation } from '../../shared/utils/prisma-errors';
import { evaluateBadges } from '../badges/badges.service';
import { getHiddenUserIds, isBlockedBetween } from '../../shared/utils/blocks';
import { createNotification } from '../notifications/notifications.service';

const logger = pino({ name: 'friends' });

const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  _count: { select: { checkins: true, badges: true } },
} as const;

export async function sendRequest(userId: string, targetId: string) {
  if (userId === targetId) throw { statusCode: 400, message: 'Você não pode seguir a si mesmo.' };

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw { statusCode: 404, message: 'Usuário não encontrado.' };

  // A block in either direction prevents a friend request (and doesn't reveal
  // which side blocked whom — same generic error).
  if (await isBlockedBetween(userId, targetId)) {
    throw { statusCode: 403, message: 'Não é possível enviar solicitação para este usuário.' };
  }

  const existing = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId, friendId: targetId } },
  });
  if (existing) {
    if (existing.status === 'ACCEPTED') throw { statusCode: 409, message: 'Já são amigos.' };
    if (existing.status === 'PENDING') throw { statusCode: 409, message: 'Solicitação já enviada.' };
  }

  // The existence check above is a read; a concurrent request can insert
  // between it and this write. Report the lost race as the conflict it is
  // rather than letting the constraint violation surface as a 500.
  let friendship;
  try {
    friendship = await prisma.friendship.create({
      data: { userId, friendId: targetId, status: 'PENDING' },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw { statusCode: 409, message: 'Solicitação já enviada.' };
    }
    throw err;
  }

  await createNotification({
    recipientId: targetId,
    actorId: userId,
    type: 'FRIEND_REQUEST',
  }).catch((err) => {
    logger.error({ err }, 'falha ao criar notificação');
  });

  return friendship;
}

export async function respondRequest(requesterId: string, responderId: string, action: 'accept' | 'reject') {
  const friendship = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: requesterId, friendId: responderId } },
  });
  if (!friendship || friendship.status !== 'PENDING') {
    throw { statusCode: 404, message: 'Solicitação não encontrada.' };
  }

  if (action === 'reject') {
    await prisma.friendship.delete({
      where: { userId_friendId: { userId: requesterId, friendId: responderId } },
    });
    return { status: 'rejected' };
  }

  // Aceitar: atualiza o registro existente e cria o inverso (amizade bidirecional)
  await prisma.$transaction([
    prisma.friendship.update({
      where: { userId_friendId: { userId: requesterId, friendId: responderId } },
      data: { status: 'ACCEPTED' },
    }),
    prisma.friendship.upsert({
      where: { userId_friendId: { userId: responderId, friendId: requesterId } },
      update: { status: 'ACCEPTED' },
      create: { userId: responderId, friendId: requesterId, status: 'ACCEPTED' },
    }),
  ]);

  // Avaliar badge "social-brewer" para ambos
  runDetached('evaluateBadges:friend', () => evaluateBadges(requesterId));
  runDetached('evaluateBadges:friend', () => evaluateBadges(responderId));

  // Notifica quem enviou a solicitação que ela foi aceita.
  await createNotification({
    recipientId: requesterId,
    actorId: responderId,
    type: 'FRIEND_ACCEPTED',
  }).catch((err) => {
    logger.error({ err }, 'falha ao criar notificação');
  });

  return { status: 'accepted' };
}

export async function removeFriend(userId: string, friendId: string) {
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    },
  });
}

export async function listFriends(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: { friend: { select: publicUserSelect } },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map((r) => r.friend);
}

export async function listPendingRequests(userId: string) {
  // Solicitações recebidas (alguém enviou para mim)
  const received = await prisma.friendship.findMany({
    where: { friendId: userId, status: 'PENDING' },
    include: { user: { select: publicUserSelect } },
    orderBy: { createdAt: 'desc' },
  });
  // Solicitações enviadas (eu enviei para alguém)
  const sent = await prisma.friendship.findMany({
    where: { userId, status: 'PENDING' },
    include: { friend: { select: publicUserSelect } },
    orderBy: { createdAt: 'desc' },
  });
  return {
    received: received.map((r) => ({ ...r.user, friendshipId: r.id })),
    sent: sent.map((r) => ({ ...r.friend, friendshipId: r.id })),
  };
}

export async function getFriendshipStatus(userId: string, targetId: string) {
  const f = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId: targetId },
        { userId: targetId, friendId: userId },
      ],
    },
  });
  if (!f) return 'none';
  if (f.status === 'ACCEPTED') return 'friends';
  if (f.userId === userId) return 'pending_sent';
  return 'pending_received';
}

export async function searchUsers(q: string, requesterId: string, page: number, perPage: number) {
  // Exclude the requester and anyone blocked in either direction.
  const hidden = await getHiddenUserIds(requesterId);
  const where = {
    AND: [
      { id: { not: requesterId, notIn: hidden } },
      {
        OR: [
          { username: { contains: q, mode: 'insensitive' as const } },
          { displayName: { contains: q, mode: 'insensitive' as const } },
        ],
      },
    ],
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: publicUserSelect,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { username: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);
  return { users, total };
}
