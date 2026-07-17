import { prisma } from '../../config/database';
import { isBlockedBetween, getHiddenUserIds } from '../../shared/utils/blocks';
import { createNotification } from '../notifications/notifications.service';
import type { CreateCommentInput } from './comments.schema';

const commentAuthor = { select: { id: true, username: true, displayName: true, avatarUrl: true } } as const;

async function getInteractableCheckin(checkinId: string, requesterId: string) {
  const checkin = await prisma.checkIn.findUnique({
    where: { id: checkinId },
    select: { id: true, userId: true, isPublic: true },
  });
  if (!checkin) throw { statusCode: 404, message: 'Check-in não encontrado.' };
  if (!checkin.isPublic && checkin.userId !== requesterId) {
    throw { statusCode: 403, message: 'Check-in privado.' };
  }
  if (checkin.userId !== requesterId && (await isBlockedBetween(requesterId, checkin.userId))) {
    throw { statusCode: 403, message: 'Ação indisponível.' };
  }
  return checkin;
}

export async function addComment(checkinId: string, userId: string, input: CreateCommentInput) {
  const checkin = await getInteractableCheckin(checkinId, userId);

  const comment = await prisma.comment.create({
    data: { checkinId, userId, body: input.body },
    include: { user: commentAuthor },
  });

  await createNotification({
    recipientId: checkin.userId,
    actorId: userId,
    type: 'COMMENT',
    checkinId,
    data: { preview: input.body.slice(0, 80) },
  }).catch(() => {});

  return comment;
}

export async function listComments(checkinId: string, requesterId: string, page: number, perPage: number) {
  await getInteractableCheckin(checkinId, requesterId);

  // Hide comments authored by users blocked in either direction.
  const hidden = await getHiddenUserIds(requesterId);
  const where = {
    checkinId,
    ...(hidden.length ? { userId: { notIn: hidden } } : {}),
  };

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { user: commentAuthor },
    }),
    prisma.comment.count({ where }),
  ]);

  return { comments, total };
}

export async function deleteComment(commentId: string, requester: { id: string; role: string }) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, checkin: { select: { userId: true } } },
  });
  if (!comment) throw { statusCode: 404, message: 'Comentário não encontrado.' };

  // The comment author, the check-in owner, or an admin may delete it.
  const canDelete =
    comment.userId === requester.id ||
    comment.checkin.userId === requester.id ||
    requester.role === 'ADMIN';
  if (!canDelete) throw { statusCode: 403, message: 'Sem permissão.' };

  await prisma.comment.delete({ where: { id: commentId } });
}
