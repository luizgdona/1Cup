import { prisma } from '../../config/database';

const blockedUserSelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw { statusCode: 400, message: 'Você não pode bloquear a si mesmo.' };

  const target = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
  if (!target) throw { statusCode: 404, message: 'Usuário não encontrado.' };

  // Create the block and tear down any existing friendship (both directions) in
  // one transaction so a block never leaves a stale friendship behind.
  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    }),
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId: blockerId, friendId: blockedId },
          { userId: blockedId, friendId: blockerId },
        ],
      },
    }),
  ]);

  return { blocked: true };
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await prisma.block.deleteMany({ where: { blockerId, blockedId } });
  return { blocked: false };
}

export async function listBlocks(blockerId: string) {
  const rows = await prisma.block.findMany({
    where: { blockerId },
    orderBy: { createdAt: 'desc' },
    include: { blocked: { select: blockedUserSelect } },
  });
  return rows.map((r) => r.blocked);
}
