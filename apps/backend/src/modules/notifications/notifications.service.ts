import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

const PAGE_SIZE = 20;

interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  actorId?: string;
  checkinId?: string;
  coffeeId?: string;
  data?: Prisma.InputJsonValue;
}

/**
 * Creates a notification. No-ops when the actor is the recipient (you never
 * notify yourself) so callers can fire it unconditionally. Best-effort: callers
 * should not let a notification failure break the primary action.
 */
export async function createNotification(input: CreateNotificationInput) {
  if (input.actorId && input.actorId === input.recipientId) return;

  await prisma.notification.create({
    data: {
      userId: input.recipientId,
      type: input.type,
      actorId: input.actorId,
      checkinId: input.checkinId,
      coffeeId: input.coffeeId,
      data: input.data,
    },
  });
}

export async function listNotifications(userId: string, cursor?: string) {
  const cursorId = cursor && /^c[a-z0-9]+$/i.test(cursor) ? cursor : undefined;

  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
    include: {
      actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      checkin: { select: { id: true, coffeeId: true } },
    },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? items.at(-1)?.id ?? null : null;

  return { items, nextCursor, hasMore };
}

export function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, id: string) {
  // updateMany scoped by userId so a user can only mark their own as read.
  const res = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

export async function markAllRead(userId: string) {
  const res = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}
