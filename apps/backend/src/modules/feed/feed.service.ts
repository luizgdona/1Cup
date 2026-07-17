import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { getHiddenUserIds } from '../../shared/utils/blocks';

const FEED_PAGE_SIZE = 20;

// Safely turn an opaque cursor back into a Date. A tampered or malformed cursor
// must be ignored (treated as "first page"), never forwarded to Prisma as an
// Invalid Date (which would throw).
function decodeCursor(cursor?: string): Date | undefined {
  if (!cursor) return undefined;
  try {
    const iso = Buffer.from(cursor, 'base64').toString('utf8');
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

// Select includes per-viewer `likes` (filtered to the requester) plus like/
// comment counts so the client can render social affordances without N+1.
function feedSelect(requesterId: string) {
  return {
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
    _count: { select: { likes: true, comments: true } },
    likes: { where: { userId: requesterId }, select: { id: true }, take: 1 },
  } satisfies Prisma.CheckInSelect;
}

type RawFeedRow = {
  createdAt: Date;
  _count: { likes: number; comments: number };
  likes: { id: string }[];
  [k: string]: unknown;
};

// Flattens the per-viewer join into `likeCount`, `commentCount`, `likedByMe`.
function shapeItems(rows: RawFeedRow[]) {
  return rows.map(({ _count, likes, ...rest }) => ({
    ...rest,
    likeCount: _count.likes,
    commentCount: _count.comments,
    likedByMe: likes.length > 0,
  }));
}

function buildResult(rows: RawFeedRow[]) {
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;
  const last = page.at(-1);
  const nextCursor = hasMore && last
    ? Buffer.from(last.createdAt.toISOString()).toString('base64')
    : null;
  return { items: shapeItems(page), nextCursor, hasMore };
}

// Feed de amigos — paginação por cursor (createdAt do último item)
export async function getFriendFeed(userId: string, cursor?: string) {
  const [friendships, hidden] = await Promise.all([
    prisma.friendship.findMany({ where: { userId, status: 'ACCEPTED' }, select: { friendId: true } }),
    getHiddenUserIds(userId),
  ]);
  const friendIds = friendships.map((f) => f.friendId).filter((id) => !hidden.includes(id));
  const authorIds = [userId, ...friendIds];

  const cursorDate = decodeCursor(cursor);
  const rows = await prisma.checkIn.findMany({
    where: {
      userId: { in: authorIds },
      isPublic: true,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: FEED_PAGE_SIZE + 1,
    select: feedSelect(userId),
  });

  return buildResult(rows as unknown as RawFeedRow[]);
}

// Feed global de descoberta (check-ins públicos recentes), sem usuários bloqueados
export async function getDiscoverFeed(userId: string, cursor?: string) {
  const hidden = await getHiddenUserIds(userId);
  const cursorDate = decodeCursor(cursor);

  const rows = await prisma.checkIn.findMany({
    where: {
      isPublic: true,
      ...(hidden.length ? { userId: { notIn: hidden } } : {}),
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: FEED_PAGE_SIZE + 1,
    select: feedSelect(userId),
  });

  return buildResult(rows as unknown as RawFeedRow[]);
}
