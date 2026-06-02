import { prisma } from '../../config/database';
import type { CreateProducerInput } from './producers.schema';

export async function listProducers(q: string | undefined, page: number, perPage: number) {
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { farmName: { contains: q, mode: 'insensitive' as const } },
          { city: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [producers, total] = await Promise.all([
    prisma.producer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { _count: { select: { coffees: true } } },
    }),
    prisma.producer.count({ where }),
  ]);

  return { producers, total };
}

export async function getProducer(id: string) {
  const producer = await prisma.producer.findUnique({
    where: { id },
    include: {
      coffees: {
        where: { isActive: true },
        include: { roastery: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!producer) throw { statusCode: 404, message: 'Produtor não encontrado.' };
  return producer;
}

export async function createProducer(input: CreateProducerInput, createdBy: string) {
  return prisma.producer.create({
    data: { ...input, createdBy },
  });
}
