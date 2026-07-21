import { prisma } from '../../config/database';
import { runDetached } from '../../shared/utils/background';
import { uploadImage, validateImageUpload } from '../../shared/utils/s3';
import { evaluateBadges } from '../badges/badges.service';
import type { CreateCheckinInput, UpdateCheckinInput } from './checkins.schema';

const checkinInclude = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  coffee: {
    select: {
      id: true,
      name: true,
      variety: true,
      roastColor: true,
      processMethod: true,
      labelImageUrl: true,
      roastery: { select: { id: true, name: true, city: true } },
    },
  },
} as const;

export async function createCheckin(input: CreateCheckinInput, userId: string) {
  const coffee = await prisma.coffee.findUnique({ where: { id: input.coffeeId }, select: { id: true } });
  if (!coffee) throw { statusCode: 404, message: 'Café não encontrado.' };

  const checkin = await prisma.checkIn.create({
    data: { ...input, userId },
    include: checkinInclude,
  });

  // Avaliar badges em background (não bloqueia a resposta)
  runDetached('evaluateBadges:checkin', () => evaluateBadges(userId));

  return checkin;
}

export async function getCheckin(id: string, requesterId: string) {
  const checkin = await prisma.checkIn.findUnique({ where: { id }, include: checkinInclude });
  if (!checkin) throw { statusCode: 404, message: 'Check-in não encontrado.' };
  if (!checkin.isPublic && checkin.user.id !== requesterId) {
    throw { statusCode: 403, message: 'Check-in privado.' };
  }
  return checkin;
}

export async function updateCheckin(id: string, userId: string, input: UpdateCheckinInput) {
  const existing = await prisma.checkIn.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) throw { statusCode: 404, message: 'Check-in não encontrado.' };
  if (existing.userId !== userId) throw { statusCode: 403, message: 'Sem permissão.' };

  return prisma.checkIn.update({ where: { id }, data: input, include: checkinInclude });
}

export async function deleteCheckin(id: string, userId: string) {
  const existing = await prisma.checkIn.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) throw { statusCode: 404, message: 'Check-in não encontrado.' };
  if (existing.userId !== userId) throw { statusCode: 403, message: 'Sem permissão.' };
  await prisma.checkIn.delete({ where: { id } });
}

export async function addPhotos(checkinId: string, userId: string, files: Array<{ buffer: Buffer; mimetype: string }>) {
  const checkin = await prisma.checkIn.findUnique({
    where: { id: checkinId },
    select: { userId: true, photos: true },
  });
  if (!checkin) throw { statusCode: 404, message: 'Check-in não encontrado.' };
  if (checkin.userId !== userId) throw { statusCode: 403, message: 'Sem permissão.' };
  if (checkin.photos.length + files.length > 3) {
    throw { statusCode: 400, message: 'Máximo de 3 fotos por check-in.' };
  }

  const urls: string[] = [];
  for (const f of files) {
    validateImageUpload(f.mimetype, f.buffer.length, f.buffer);
    const url = await uploadImage(f.buffer, f.mimetype, `checkins/${checkinId}`);
    urls.push(url);
  }

  return prisma.checkIn.update({
    where: { id: checkinId },
    data: { photos: { push: urls } },
    select: { id: true, photos: true },
  });
}
