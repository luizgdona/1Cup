import { prisma } from '../../config/database';
import { isBlockedBetween } from '../../shared/utils/blocks';
import { createNotification } from '../notifications/notifications.service';

/** Fetches a check-in the requester is allowed to interact with. */
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

export async function likeCheckin(checkinId: string, userId: string) {
  const checkin = await getInteractableCheckin(checkinId, userId);

  // Idempotent: a repeated like is a no-op, not an error.
  const existing = await prisma.checkInLike.findUnique({
    where: { userId_checkinId: { userId, checkinId } },
    select: { id: true },
  });
  if (!existing) {
    await prisma.checkInLike.create({ data: { userId, checkinId } });
    await createNotification({
      recipientId: checkin.userId,
      actorId: userId,
      type: 'LIKE',
      checkinId,
    }).catch(() => {});
  }

  const count = await prisma.checkInLike.count({ where: { checkinId } });
  return { liked: true, likeCount: count };
}

export async function unlikeCheckin(checkinId: string, userId: string) {
  await prisma.checkInLike.deleteMany({ where: { userId, checkinId } });
  const count = await prisma.checkInLike.count({ where: { checkinId } });
  return { liked: false, likeCount: count };
}
