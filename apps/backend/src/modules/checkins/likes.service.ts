import pino from 'pino';

import { prisma } from '../../config/database';
import { runDetached } from '../../shared/utils/background';
import { isBlockedBetween } from '../../shared/utils/blocks';
import { isUniqueViolation } from '../../shared/utils/prisma-errors';
import { evaluateBadges } from '../badges/badges.service';
import { createNotification } from '../notifications/notifications.service';

const logger = pino({ name: 'likes' });

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
    // The check above is a read; a concurrent like can insert between it and
    // this write. The unique constraint rejects the duplicate, which must stay
    // a no-op rather than becoming a 500 on an endpoint documented as
    // idempotent. Losing the race also means the other request already fired
    // the notification and badge evaluation, so skip both.
    let inserted = true;
    try {
      await prisma.checkInLike.create({ data: { userId, checkinId } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      inserted = false;
    }

    if (inserted) {
      await createNotification({
        recipientId: checkin.userId,
        actorId: userId,
        type: 'LIKE',
        checkinId,
      }).catch((err) => {
        logger.error({ err, checkinId }, 'falha ao criar notificação de like');
      });

      // The check-in owner may cross a "likes received" badge threshold.
      runDetached('evaluateBadges:like', () => evaluateBadges(checkin.userId));
    }
  }

  const count = await prisma.checkInLike.count({ where: { checkinId } });
  return { liked: true, likeCount: count };
}

export async function unlikeCheckin(checkinId: string, userId: string) {
  await prisma.checkInLike.deleteMany({ where: { userId, checkinId } });
  const count = await prisma.checkInLike.count({ where: { checkinId } });
  return { liked: false, likeCount: count };
}
