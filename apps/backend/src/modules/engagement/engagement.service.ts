import { prisma } from '../../config/database';

const publicUserSelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

/**
 * Top users by a chosen metric. Global (leaderboards are public standings), so
 * block lists don't apply here.
 */
export async function getLeaderboard(metric: 'checkins' | 'badges', limit: number) {
  if (metric === 'badges') {
    const grouped = await prisma.userBadge.groupBy({
      by: ['userId'],
      _count: { badgeId: true },
      orderBy: { _count: { badgeId: 'desc' } },
      take: limit,
    });
    return hydrate(grouped.map((g) => ({ userId: g.userId, score: g._count.badgeId })));
  }

  const grouped = await prisma.checkIn.groupBy({
    by: ['userId'],
    where: { isPublic: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });
  return hydrate(grouped.map((g) => ({ userId: g.userId, score: g._count.id })));
}

async function hydrate(rows: { userId: string; score: number }[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: publicUserSelect,
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  // Preserve the ranked order and attach the score + rank.
  return rows
    .map((r, i) => {
      const user = byId.get(r.userId);
      return user ? { rank: i + 1, score: r.score, user } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/**
 * "Coffees you might like": active coffees the user hasn't checked in yet,
 * biased toward roasteries they've engaged with (checked in or follow), ordered
 * by community popularity. Falls back to globally popular coffees.
 */
export async function getRecommendations(userId: string, limit: number) {
  const [checkedIn, follows] = await Promise.all([
    prisma.checkIn.findMany({ where: { userId }, select: { coffeeId: true, coffee: { select: { roasteryId: true } } }, distinct: ['coffeeId'] }),
    prisma.follow.findMany({ where: { userId }, select: { coffeeId: true, roasteryId: true } }),
  ]);

  const checkedCoffeeIds = new Set(checkedIn.map((c) => c.coffeeId));
  follows.forEach((f) => f.coffeeId && checkedCoffeeIds.add(f.coffeeId));

  const affinityRoasteryIds = new Set<string>();
  checkedIn.forEach((c) => affinityRoasteryIds.add(c.coffee.roasteryId));
  follows.forEach((f) => f.roasteryId && affinityRoasteryIds.add(f.roasteryId));

  const exclude = { id: { notIn: [...checkedCoffeeIds] } };
  const include = {
    roastery: { select: { id: true, name: true } },
    _count: { select: { checkins: true } },
  } as const;

  // Primary: coffees from roasteries the user likes, most-reviewed first.
  let coffees: any[] = [];
  if (affinityRoasteryIds.size > 0) {
    coffees = await prisma.coffee.findMany({
      where: { isActive: true, roasteryId: { in: [...affinityRoasteryIds] }, ...exclude },
      orderBy: [{ checkins: { _count: 'desc' } }, { scaScore: 'desc' }],
      take: limit,
      include,
    });
  }

  // Fallback / top-up: globally popular coffees not yet tried.
  if (coffees.length < limit) {
    const more = await prisma.coffee.findMany({
      where: { isActive: true, id: { notIn: [...checkedCoffeeIds, ...coffees.map((c) => c.id)] } },
      orderBy: [{ checkins: { _count: 'desc' } }, { scaScore: 'desc' }],
      take: limit - coffees.length,
      include,
    });
    coffees = [...coffees, ...more];
  }

  return coffees;
}

/**
 * Onboarding checklist + a few things to do, to defeat the empty-feed cold
 * start for new users.
 */
export async function getOnboarding(userId: string) {
  const [user, checkinCount, followCount, friendCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } }),
    prisma.checkIn.count({ where: { userId } }),
    prisma.follow.count({ where: { userId } }),
    prisma.friendship.count({ where: { userId, status: 'ACCEPTED' } }),
  ]);

  const steps = {
    verifyEmail: Boolean(user?.isVerified),
    firstCheckin: checkinCount > 0,
    followSomething: followCount > 0,
    addFriend: friendCount > 0,
  };
  const completed = Object.values(steps).filter(Boolean).length;

  // Suggest a few popular roasteries to follow to bootstrap the feed.
  const suggestedRoasteries = await prisma.roastery.findMany({
    orderBy: { coffees: { _count: 'desc' } },
    take: 5,
    select: { id: true, name: true, city: true, state: true, logoUrl: true },
  });

  return {
    steps,
    completed,
    total: Object.keys(steps).length,
    done: completed === Object.keys(steps).length,
    suggestedRoasteries,
  };
}
