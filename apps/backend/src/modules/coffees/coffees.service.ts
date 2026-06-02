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

  const avgRating = coffee.checkins.length > 0
    ? coffee.checkins.reduce((acc, c) => acc + c.rating, 0) / coffee.checkins.length / 10
    : null;

  return { ...coffee, avgRating };
}

export async function createCoffee(input: CreateCoffeeInput, createdBy: string) {
  const roasteryExists = await prisma.roastery.findUnique({ where: { id: input.roasteryId }, select: { id: true } });
  if (!roasteryExists) throw { statusCode: 404, message: 'Torrefação não encontrada.' };

  return prisma.coffee.create({
    data: { ...input, createdBy },
    include: coffeeInclude,
  });
}

export async function uploadLabel(coffeeId: string, buffer: Buffer, mimetype: string) {
  validateImageUpload(mimetype, buffer.length);
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
