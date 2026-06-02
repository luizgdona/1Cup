import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { revokeAllUserTokens } from '../auth/auth.service';
import type { UpdateProfileInput, ChangePasswordInput } from './users.schema';

const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
} as const;

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUserSelect,
      email: true,
      isVerified: true,
      _count: {
        select: {
          checkins: true,
          badges: true,
          friendships: { where: { status: 'ACCEPTED' } },
        },
      },
    },
  });

  if (!user) throw { statusCode: 404, message: 'Usuário não encontrado.' };
  return user;
}

export async function getByUsername(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      ...publicUserSelect,
      _count: {
        select: {
          checkins: { where: { isPublic: true } },
          badges: true,
          friendships: { where: { status: 'ACCEPTED' } },
        },
      },
    },
  });

  if (!user) throw { statusCode: 404, message: 'Usuário não encontrado.' };
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: publicUserSelect,
  });
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: publicUserSelect,
  });
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw { statusCode: 404, message: 'Usuário não encontrado.' };

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw { statusCode: 400, message: 'Senha atual incorreta.' };

  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await revokeAllUserTokens(userId);
}

export async function deleteAccount(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}

export async function getUserCheckins(username: string, page: number, perPage: number) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw { statusCode: 404, message: 'Usuário não encontrado.' };

  const [checkins, total] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId: user.id, isPublic: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        coffee: {
          select: {
            id: true,
            name: true,
            roastery: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.checkIn.count({ where: { userId: user.id, isPublic: true } }),
  ]);

  return { checkins, total };
}

export async function getUserBadges(username: string) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw { statusCode: 404, message: 'Usuário não encontrado.' };

  return prisma.userBadge.findMany({
    where: { userId: user.id },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  });
}

export async function getUserStats(username: string) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw { statusCode: 404, message: 'Usuário não encontrado.' };

  const [totalCheckins, uniqueCoffees, totalBadges] = await Promise.all([
    prisma.checkIn.count({ where: { userId: user.id, isPublic: true } }),
    prisma.checkIn.groupBy({
      by: ['coffeeId'],
      where: { userId: user.id, isPublic: true },
    }).then((r) => r.length),
    prisma.userBadge.count({ where: { userId: user.id } }),
  ]);

  return { totalCheckins, uniqueCoffees, totalBadges };
}
