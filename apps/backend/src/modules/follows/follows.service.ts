import { prisma } from '../../config/database';

export async function followCoffee(userId: string, coffeeId: string) {
  const coffee = await prisma.coffee.findFirst({
    where: { id: coffeeId, isActive: true },
    select: { id: true },
  });
  if (!coffee) throw { statusCode: 404, message: 'Café não encontrado.' };

  await prisma.follow.upsert({
    where: { userId_coffeeId: { userId, coffeeId } },
    update: {},
    create: { userId, coffeeId },
  });
  const count = await prisma.follow.count({ where: { coffeeId } });
  return { following: true, followerCount: count };
}

export async function unfollowCoffee(userId: string, coffeeId: string) {
  await prisma.follow.deleteMany({ where: { userId, coffeeId } });
  const count = await prisma.follow.count({ where: { coffeeId } });
  return { following: false, followerCount: count };
}

export async function followRoastery(userId: string, roasteryId: string) {
  const roastery = await prisma.roastery.findUnique({ where: { id: roasteryId }, select: { id: true } });
  if (!roastery) throw { statusCode: 404, message: 'Torrefação não encontrada.' };

  await prisma.follow.upsert({
    where: { userId_roasteryId: { userId, roasteryId } },
    update: {},
    create: { userId, roasteryId },
  });
  const count = await prisma.follow.count({ where: { roasteryId } });
  return { following: true, followerCount: count };
}

export async function unfollowRoastery(userId: string, roasteryId: string) {
  await prisma.follow.deleteMany({ where: { userId, roasteryId } });
  const count = await prisma.follow.count({ where: { roasteryId } });
  return { following: false, followerCount: count };
}

export async function listMyFollows(userId: string) {
  const rows = await prisma.follow.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      coffee: { select: { id: true, name: true, roastColor: true, labelImageUrl: true, roastery: { select: { id: true, name: true } } } },
      roastery: { select: { id: true, name: true, city: true, state: true, logoUrl: true } },
    },
  });

  return {
    coffees: rows.filter((r) => r.coffee).map((r) => r.coffee),
    roasteries: rows.filter((r) => r.roastery).map((r) => r.roastery),
  };
}
