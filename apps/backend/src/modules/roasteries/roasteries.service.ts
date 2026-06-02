import { prisma } from '../../config/database';
import { uploadImage, validateImageUpload } from '../../shared/utils/s3';
import type { CreateRoasteryInput } from './roasteries.schema';

export async function listRoasteries(q: string | undefined, page: number, perPage: number) {
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { city: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [roasteries, total] = await Promise.all([
    prisma.roastery.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { _count: { select: { coffees: true } } },
    }),
    prisma.roastery.count({ where }),
  ]);

  return { roasteries, total };
}

export async function getRoastery(id: string) {
  const roastery = await prisma.roastery.findUnique({
    where: { id },
    include: {
      coffees: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          producer: { select: { id: true, name: true, country: true } },
          _count: { select: { checkins: true } },
        },
      },
    },
  });
  if (!roastery) throw { statusCode: 404, message: 'Torrefação não encontrada.' };
  return roastery;
}

export async function createRoastery(input: CreateRoasteryInput, createdBy: string) {
  return prisma.roastery.create({ data: { ...input, createdBy } });
}

export async function uploadLogo(roasteryId: string, buffer: Buffer, mimetype: string) {
  validateImageUpload(mimetype, buffer.length);
  const url = await uploadImage(buffer, mimetype, 'roasteries/logos');
  return prisma.roastery.update({
    where: { id: roasteryId },
    data: { logoUrl: url },
    select: { id: true, logoUrl: true },
  });
}
