import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { uploadImage, validateImageUpload } from '../../shared/utils/s3';
import type { CreateCoffeeInput, ListCoffeesQuery } from './coffees.schema';

const coffeeInclude = {
  roastery: { select: { id: true, name: true, city: true, state: true, logoUrl: true } },
  producer: { select: { id: true, name: true, farmName: true, country: true } },
  _count: { select: { checkins: true } },
} as const;

const coffeeSort: Record<string, Prisma.CoffeeOrderByWithRelationInput> = {
  name: { name: 'asc' },
  newest: { createdAt: 'desc' },
  score: { scaScore: 'desc' },
};

export async function listCoffees(query: ListCoffeesQuery) {
  const { q, roasteryId, producerId, roastColor, processMethod, country, scaMin, brewMethod, sort, page, perPage } = query;

  const where: Prisma.CoffeeWhereInput = { isActive: true };
  if (roasteryId) where.roasteryId = roasteryId;
  if (producerId) where.producerId = producerId;
  if (roastColor) where.roastColor = roastColor;
  if (processMethod) where.processMethod = { contains: processMethod, mode: 'insensitive' };
  if (country) where.producer = { country: { contains: country, mode: 'insensitive' } };
  if (scaMin !== undefined) where.scaScore = { gte: scaMin };
  if (brewMethod) where.brewMethods = { has: brewMethod };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { variety: { contains: q, mode: 'insensitive' } },
      { tastingNotes: { has: q } },
      { roastery: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [coffees, total] = await Promise.all([
    prisma.coffee.findMany({
      where,
      orderBy: coffeeSort[sort] ?? coffeeSort.name,
      skip: (page - 1) * perPage,
      take: perPage,
      include: coffeeInclude,
    }),
    prisma.coffee.count({ where }),
  ]);

  return { coffees, total };
}

export async function getCoffee(id: string, requesterId?: string) {
  const coffee = await prisma.coffee.findUnique({
    where: { id },
    include: {
      ...coffeeInclude,
      _count: { select: { followers: true } },
      checkins: {
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!coffee) throw { statusCode: 404, message: 'Café não encontrado.' };

  // Average must aggregate over ALL public check-ins, not just the 10 most
  // recent ones included above for display — otherwise the rating drifts as
  // more reviews come in. Rating is stored 0–50, shown as 0–5.
  const [agg, myFollow] = await Promise.all([
    prisma.checkIn.aggregate({
      where: { coffeeId: id, isPublic: true },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    requesterId
      ? prisma.follow.findUnique({ where: { userId_coffeeId: { userId: requesterId, coffeeId: id } }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  const avgRating = agg._avg.rating != null ? agg._avg.rating / 10 : null;

  return {
    ...coffee,
    avgRating,
    ratingCount: agg._count.rating,
    followerCount: coffee._count.followers,
    followedByMe: myFollow !== null,
  };
}

export async function createCoffee(input: CreateCoffeeInput, createdBy: string) {
  const roasteryExists = await prisma.roastery.findUnique({ where: { id: input.roasteryId }, select: { id: true } });
  if (!roasteryExists) throw { statusCode: 404, message: 'Torrefação não encontrada.' };

  const coffee = await prisma.coffee.create({
    data: { ...input, createdBy },
    include: coffeeInclude,
  });

  // Notify followers of the roastery (except the creator) about the new coffee.
  // Best-effort, batched — never blocks the create response on failure.
  try {
    const followers = await prisma.follow.findMany({
      where: { roasteryId: input.roasteryId, userId: { not: createdBy } },
      select: { userId: true },
    });
    if (followers.length > 0) {
      await prisma.notification.createMany({
        data: followers.map((f) => ({
          userId: f.userId,
          type: 'NEW_COFFEE' as const,
          actorId: createdBy,
          coffeeId: coffee.id,
        })),
      });
    }
  } catch {
    /* notifications are non-critical */
  }

  return coffee;
}

export async function uploadLabel(
  coffeeId: string,
  buffer: Buffer,
  mimetype: string,
  requester: { id: string; role: string },
) {
  const coffee = await prisma.coffee.findUnique({ where: { id: coffeeId }, select: { id: true, createdBy: true } });
  if (!coffee) throw { statusCode: 404, message: 'Café não encontrado.' };

  // Only the person who added the coffee, or an admin, may replace its label.
  const isOwner = coffee.createdBy && coffee.createdBy === requester.id;
  if (!isOwner && requester.role !== 'ADMIN') {
    throw { statusCode: 403, message: 'Sem permissão para alterar este café.' };
  }

  validateImageUpload(mimetype, buffer.length, buffer);
  const url = await uploadImage(buffer, mimetype, 'coffees/labels');
  return prisma.coffee.update({
    where: { id: coffeeId },
    data: { labelImageUrl: url },
    select: { id: true, labelImageUrl: true },
  });
}

export async function createSuggestion(
  coffeeId: string,
  userId: string,
  payload: Record<string, unknown>,
) {
  const coffee = await prisma.coffee.findUnique({ where: { id: coffeeId }, select: { id: true } });
  if (!coffee) throw { statusCode: 404, message: 'Café não encontrado.' };

  return prisma.editSuggestion.create({
    data: {
      entityType: 'COFFEE',
      coffeeId,
      userId,
      payload: payload as Prisma.InputJsonValue,
    },
  });
}
