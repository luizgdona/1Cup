import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { uploadImage, validateImageUpload } from '../../shared/utils/s3';
import type { CreateCoffeeInput, ListCoffeesQuery } from './coffees.schema';

const coffeeInclude = {
  roastery: { select: { id: true, name: true, city: true, state: true, logoUrl: true } },
  producer: { select: { id: true, name: true, farmName: true, country: true } },
  _count: { select: { checkins: true } },
} as const;

export async function listCoffees(query: ListCoffeesQuery) {
  const { q, roasteryId, producerId, roastColor, page, perPage } = query;

  const where: Record<string, unknown> = { isActive: true };
  if (roasteryId) where.roasteryId = roasteryId;
  if (producerId) where.producerId = producerId;
  if (roastColor) where.roastColor = roastColor;
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
      orderBy: { name: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: coffeeInclude,
    }),
    prisma.coffee.count({ where }),
  ]);

  return { coffees, total };
}

export async function getCoffee(id: string) {
  const coffee = await prisma.coffee.findUnique({
    where: { id },
    include: {
      ...coffeeInclude,
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
  const agg = await prisma.checkIn.aggregate({
    where: { coffeeId: id, isPublic: true },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const avgRating = agg._avg.rating != null ? agg._avg.rating / 10 : null;

  return { ...coffee, avgRating, ratingCount: agg._count.rating };
}

export async function createCoffee(input: CreateCoffeeInput, createdBy: string) {
  const roasteryExists = await prisma.roastery.findUnique({ where: { id: input.roasteryId }, select: { id: true } });
  if (!roasteryExists) throw { statusCode: 404, message: 'Torrefação não encontrada.' };

  return prisma.coffee.create({
    data: { ...input, createdBy },
    include: coffeeInclude,
  });
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
      entityId: coffeeId,
      userId,
      payload: payload as Prisma.InputJsonValue,
    },
  });
}
