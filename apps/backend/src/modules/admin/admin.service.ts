import { prisma } from '../../config/database';
import { z } from 'zod';
import { reviewSuggestionSchema, listSuggestionsSchema, updateUserRoleSchema } from './admin.schema';

type ListSuggestionsQuery = z.infer<typeof listSuggestionsSchema>;
type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
type ReviewInput = z.infer<typeof reviewSuggestionSchema>;

export async function listSuggestions(query: ListSuggestionsQuery) {
  const { status, page, perPage } = query;
  const where = { status } as const;

  const [suggestions, total] = await Promise.all([
    prisma.editSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        coffee: { select: { id: true, name: true } },
        producer: { select: { id: true, name: true } },
        roastery: { select: { id: true, name: true } },
      },
    }),
    prisma.editSuggestion.count({ where }),
  ]);

  return { suggestions, total };
}

export async function reviewSuggestion(id: string, adminId: string, input: ReviewInput) {
  const suggestion = await prisma.editSuggestion.findUnique({ where: { id } });
  if (!suggestion) throw { statusCode: 404, message: 'Sugestão não encontrada.' };
  if (suggestion.status !== 'PENDING') throw { statusCode: 409, message: 'Sugestão já revisada.' };

  if (input.action === 'approve') {
    // The target id lives in the column matching entityType.
    const entityId = suggestion.coffeeId ?? suggestion.producerId ?? suggestion.roasteryId;
    if (entityId) {
      await applyPayload(suggestion.entityType, entityId, suggestion.payload as Record<string, unknown>);
    }
  }

  return prisma.editSuggestion.update({
    where: { id },
    data: {
      status: input.action === 'approve' ? 'APPROVED' : 'REJECTED',
      reviewedBy: adminId,
      reviewNote: input.reviewNote,
    },
  });
}

// Explicit allowlists of the ONLY columns a community edit suggestion may touch.
// Never include id, relations (roasteryId/producerId), ownership (createdBy),
// moderation (isActive) or timestamps — otherwise approving a crafted suggestion
// would be a mass-assignment vector (e.g. reassigning a coffee to another roastery
// or silently unpublishing catalog entries).
const SUGGESTABLE_FIELDS: Record<string, readonly string[]> = {
  COFFEE: ['name', 'variety', 'roastColor', 'processMethod', 'tastingNotes', 'scaScore', 'brewMethods'],
  PRODUCER: ['name', 'farmName', 'city', 'state', 'country', 'altitude'],
  ROASTERY: ['name', 'city', 'state', 'country', 'instagram', 'website', 'logoUrl'],
};

function pickAllowed(entityType: string, payload: Record<string, unknown>) {
  const allowed = SUGGESTABLE_FIELDS[entityType] ?? [];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) data[key] = payload[key];
  }
  return data;
}

async function applyPayload(entityType: string, entityId: string, payload: Record<string, unknown>) {
  const safe = pickAllowed(entityType, payload);
  if (Object.keys(safe).length === 0) return; // nothing safe to apply

  switch (entityType) {
    case 'COFFEE':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.coffee.update({ where: { id: entityId }, data: safe as Record<string, any> });
      break;
    case 'PRODUCER':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.producer.update({ where: { id: entityId }, data: safe as Record<string, any> });
      break;
    case 'ROASTERY':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.roastery.update({ where: { id: entityId }, data: safe as Record<string, any> });
      break;
  }
}

export async function listUsers(page: number, perPage: number, q?: string) {
  const where = q
    ? {
        OR: [
          { username: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { displayName: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { checkins: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

export async function updateUserRole(userId: string, input: UpdateUserRoleInput, actingAdminId: string) {
  // Prevent an admin from changing their own role (self-lockout / accidental
  // demotion of the only admin).
  if (userId === actingAdminId) {
    throw { statusCode: 400, message: 'Você não pode alterar seu próprio papel.' };
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw { statusCode: 404, message: 'Usuário não encontrado.' };

  return prisma.user.update({
    where: { id: userId },
    data: { role: input.role },
    select: { id: true, username: true, role: true },
  });
}

export async function getMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsers, checkinsToday, totalCoffees, pendingSuggestions] = await Promise.all([
    prisma.user.count(),
    prisma.checkIn.count({ where: { createdAt: { gte: today } } }),
    prisma.coffee.count({ where: { isActive: true } }),
    prisma.editSuggestion.count({ where: { status: 'PENDING' } }),
  ]);

  return { totalUsers, checkinsToday, totalCoffees, pendingSuggestions };
}
