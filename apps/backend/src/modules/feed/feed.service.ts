import { prisma } from '../../config/database';

const FEED_PAGE_SIZE = 20;

const feedCheckinSelect = {
  id: true,
  rating: true,
  description: true,
  brewMethod: true,
  locationName: true,
  photos: true,
  createdAt: true,
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  coffee: {
    select: {
      id: true,
      name: true,
      variety: true,
      roastColor: true,
      labelImageUrl: true,
      roastery: { select: { id: true, name: true } },
    },
  },
} as const;

// Feed de amigos — paginação por cursor (createdAt do último item)
export async function getFriendFeed(userId: string, cursor?: string) {
  // IDs dos amigos confirmados
  const friendships = await prisma.friendship.findMany({
    where: { userId, status: 'ACCEPTED' },
    select: { friendId: true },
  });
  const friendIds = friendships.map((f) => f.friendId);

  // Inclui o próprio usuário no feed
  const authorIds = [userId, ...friendIds];

  const cursorDate = cursor ? new Date(Buffer.from(cursor, 'base64').toString()) : undefined;

  const checkins = await prisma.checkIn.findMany({
    where: {
      userId: { in: authorIds },
      isPublic: true,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: FEED_PAGE_SIZE + 1, // pega um a mais para saber se há próxima página
    select: feedCheckinSelect,
  });

  const hasMore = checkins.length > FEED_PAGE_SIZE;
  const items = hasMore ? checkins.slice(0, FEED_PAGE_SIZE) : checkins;
  const lastItem = items.at(-1);
  const nextCursor = hasMore && lastItem
    ? Buffer.from(lastItem.createdAt.toISOString()).toString('base64')
    : null;

  return { items, nextCursor, hasMore };
}

// Feed global de descoberta (check-ins públicos recentes)
export async function getDiscoverFeed(cursor?: string) {
  const cursorDate = cursor ? new Date(Buffer.from(cursor, 'base64').toString()) : undefined;

  const checkins = await prisma.checkIn.findMany({
    where: {
      isPublic: true,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: FEED_PAGE_SIZE + 1,
    select: feedCheckinSelect,
  });

  const hasMore = checkins.length > FEED_PAGE_SIZE;
  const items = hasMore ? checkins.slice(0, FEED_PAGE_SIZE) : checkins;
  const lastItem = items.at(-1);
  const nextCursor = hasMore && lastItem
    ? Buffer.from(lastItem.createdAt.toISOString()).toString('base64')
    : null;

  return { items, nextCursor, hasMore };
}
