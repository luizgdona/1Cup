import pino from 'pino';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { createNotification } from '../notifications/notifications.service';

const logger = pino({ name: 'badges' });

// ── Badge Engine ──────────────────────────────────────────
// Evaluated after check-ins and social actions. Awards any active badge the
// user newly qualifies for and fires a BADGE_EARNED notification.

interface BadgeRule {
  type: string;
  value: number;
  filter?: Record<string, unknown>;
}

const TZ = 'America/Sao_Paulo';

export async function evaluateBadges(userId: string): Promise<string[]> {
  const [allBadges, userBadgeIds] = await Promise.all([
    prisma.badge.findMany({ where: { isActive: true } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }).then((r) =>
      new Set(r.map((b) => b.badgeId)),
    ),
  ]);

  const pending = allBadges.filter((b) => !userBadgeIds.has(b.id));
  const earned: string[] = [];

  for (const badge of pending) {
    const rule = badge.rule as unknown as BadgeRule;
    const qualifies = await checkRule(userId, rule);
    if (qualifies) {
      // Guard the unique constraint against concurrent evaluations.
      try {
        await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      } catch {
        continue; // already awarded by a racing evaluation
      }
      earned.push(badge.slug);
      await createNotification({
        recipientId: userId,
        type: 'BADGE_EARNED',
        data: { slug: badge.slug, name: badge.name, tier: badge.tier, iconName: badge.iconName },
      }).catch((err) => {
        logger.error({ err, badge: badge.slug }, 'falha ao notificar badge conquistado');
      });
    }
  }

  return earned;
}

/**
 * Current and longest consecutive-day check-in streaks (in the app timezone).
 * Exposed for the streak endpoint and reused by streak badges.
 */
export async function computeStreak(userId: string): Promise<{ current: number; longest: number }> {
  const rows = await prisma.$queryRaw<{ day: Date }[]>`
    SELECT DISTINCT (created_at AT TIME ZONE ${TZ})::date AS day
    FROM checkins
    WHERE user_id = ${userId}
    ORDER BY day
  `;
  if (rows.length === 0) return { current: 0, longest: 0 };

  const days = rows.map((r) => new Date(r.day).getTime());
  const DAY = 86_400_000;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((days[i] - days[i - 1]) / DAY);
    run = diff === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Current streak counts back from today (or yesterday) through consecutive days.
  const todayRow = await prisma.$queryRaw<{ today: Date }[]>`SELECT (now() AT TIME ZONE ${TZ})::date AS today`;
  const today = new Date(todayRow[0].today).getTime();
  const last = days[days.length - 1];
  const gapFromToday = Math.round((today - last) / DAY);

  let current = 0;
  if (gapFromToday <= 1) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      if (Math.round((days[i] - days[i - 1]) / DAY) === 1) current++;
      else break;
    }
  }

  return { current, longest };
}

async function checkRule(userId: string, rule: BadgeRule): Promise<boolean> {
  switch (rule.type) {
    case 'checkin_count':
      return (await prisma.checkIn.count({ where: { userId } })) >= rule.value;

    case 'unique_coffee_count': {
      const rows = await prisma.checkIn.groupBy({ by: ['coffeeId'], where: { userId } });
      return rows.length >= rule.value;
    }

    case 'roast_count':
      return (await prisma.checkIn.count({
        where: { userId, coffee: { roastColor: (rule.filter?.roastColor as any) ?? undefined } },
      })) >= rule.value;

    case 'roastery_count': {
      const rows = await prisma.checkIn.findMany({
        where: { userId },
        select: { coffee: { select: { roasteryId: true } } },
        distinct: ['coffeeId'],
      });
      return new Set(rows.map((r) => r.coffee.roasteryId)).size >= rule.value;
    }

    case 'producer_count': {
      const rows = await prisma.checkIn.findMany({
        where: { userId, coffee: { producerId: { not: null } } },
        select: { coffee: { select: { producerId: true } } },
        distinct: ['coffeeId'],
      });
      return new Set(rows.map((r) => r.coffee.producerId).filter(Boolean)).size >= rule.value;
    }

    case 'country_count': {
      const rows = await prisma.checkIn.findMany({
        where: { userId, coffee: { producer: { isNot: null } } },
        select: { coffee: { select: { producer: { select: { country: true } } } } },
        distinct: ['coffeeId'],
      });
      return new Set(rows.map((r) => r.coffee.producer?.country).filter(Boolean)).size >= rule.value;
    }

    case 'variety_count': {
      const rows = await prisma.checkIn.findMany({
        where: { userId, coffee: { variety: { not: null } } },
        select: { coffee: { select: { variety: true } } },
        distinct: ['coffeeId'],
      });
      return new Set(rows.map((r) => r.coffee.variety).filter(Boolean)).size >= rule.value;
    }

    case 'method_count': {
      const rows = await prisma.checkIn.findMany({
        where: { userId, brewMethod: { not: null } },
        select: { brewMethod: true },
        distinct: ['brewMethod'],
      });
      return rows.length >= rule.value;
    }

    case 'process_count': {
      const rows = await prisma.checkIn.findMany({
        where: { userId, coffee: { processMethod: { not: null } } },
        select: { coffee: { select: { processMethod: true } } },
        distinct: ['coffeeId'],
      });
      return new Set(rows.map((r) => r.coffee.processMethod).filter(Boolean)).size >= rule.value;
    }

    case 'high_rating_count':
      // rating stored 0–50; default threshold 4.5 stars (45)
      return (await prisma.checkIn.count({
        where: { userId, rating: { gte: (rule.filter?.min as number) ?? 45 } },
      })) >= rule.value;

    case 'sca_connoisseur':
      return (await prisma.checkIn.count({
        where: { userId, coffee: { scaScore: { gte: (rule.filter?.min as number) ?? 90 } } },
      })) >= rule.value;

    case 'photo_count':
      return (await prisma.checkIn.count({
        where: { userId, NOT: { photos: { isEmpty: true } } },
      })) >= rule.value;

    case 'early_bird': {
      const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM checkins
        WHERE user_id = ${userId}
        AND EXTRACT(HOUR FROM created_at AT TIME ZONE ${TZ}) < 8
      `;
      return Number(rows[0]?.count ?? 0) >= rule.value;
    }

    case 'night_owl': {
      const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM checkins
        WHERE user_id = ${userId}
        AND EXTRACT(HOUR FROM created_at AT TIME ZONE ${TZ}) >= 22
      `;
      return Number(rows[0]?.count ?? 0) >= rule.value;
    }

    case 'weekend_count': {
      const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM checkins
        WHERE user_id = ${userId}
        AND EXTRACT(DOW FROM created_at AT TIME ZONE ${TZ}) IN (0, 6)
      `;
      return Number(rows[0]?.count ?? 0) >= rule.value;
    }

    case 'streak_days':
      return (await computeStreak(userId)).longest >= rule.value;

    case 'friend_count':
      return (await prisma.friendship.count({ where: { userId, status: 'ACCEPTED' } })) >= rule.value;

    case 'follows_count':
      return (await prisma.follow.count({ where: { userId } })) >= rule.value;

    case 'comments_made':
      return (await prisma.comment.count({ where: { userId } })) >= rule.value;

    case 'likes_received': {
      const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM checkin_likes l
        JOIN checkins c ON c.id = l.checkin_id
        WHERE c.user_id = ${userId}
      `;
      return Number(rows[0]?.count ?? 0) >= rule.value;
    }

    default:
      return false;
  }
}

export async function listBadges() {
  return prisma.badge.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { tier: 'asc' }] });
}

// ── Seed catalog ──────────────────────────────────────────
type SeedBadge = {
  slug: string; name: string; description: string; iconName: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  category: 'MILESTONE' | 'EXPLORER' | 'CONNOISSEUR' | 'SOCIAL' | 'DEDICATION';
  rule: BadgeRule;
};

export const BADGE_SEED: SeedBadge[] = [
  // Milestones — total check-ins
  { slug: 'first-checkin', name: 'Primeira Xícara', description: 'Fez o primeiro check-in', iconName: 'coffee', tier: 'BRONZE', category: 'MILESTONE', rule: { type: 'checkin_count', value: 1 } },
  { slug: 'ten-checkins', name: 'Decafeinado não conta', description: 'Fez 10 check-ins', iconName: 'local_cafe', tier: 'BRONZE', category: 'MILESTONE', rule: { type: 'checkin_count', value: 10 } },
  { slug: 'fifty-checkins', name: 'Viciado em Cafeína', description: 'Fez 50 check-ins', iconName: 'bolt', tier: 'SILVER', category: 'MILESTONE', rule: { type: 'checkin_count', value: 50 } },
  { slug: 'hundred-checkins', name: 'Centurião do Café', description: 'Fez 100 check-ins', iconName: 'military_tech', tier: 'GOLD', category: 'MILESTONE', rule: { type: 'checkin_count', value: 100 } },
  { slug: 'fivehundred-checkins', name: 'Lenda do Balcão', description: 'Fez 500 check-ins', iconName: 'workspace_premium', tier: 'PLATINUM', category: 'MILESTONE', rule: { type: 'checkin_count', value: 500 } },

  // Explorer — variety & origins
  { slug: 'explorer-10-coffees', name: 'Explorador', description: 'Provou 10 cafés diferentes', iconName: 'travel_explore', tier: 'BRONZE', category: 'EXPLORER', rule: { type: 'unique_coffee_count', value: 10 } },
  { slug: 'explorer-50-coffees', name: 'Grande Explorador', description: 'Provou 50 cafés diferentes', iconName: 'explore', tier: 'GOLD', category: 'EXPLORER', rule: { type: 'unique_coffee_count', value: 50 } },
  { slug: 'roastery-hopper', name: 'Turista de Torrefações', description: 'Cafés de 10 torrefações diferentes', iconName: 'storefront', tier: 'SILVER', category: 'EXPLORER', rule: { type: 'roastery_count', value: 10 } },
  { slug: 'farm-to-cup', name: 'Da Fazenda à Xícara', description: 'Cafés de 10 produtores diferentes', iconName: 'agriculture', tier: 'SILVER', category: 'EXPLORER', rule: { type: 'producer_count', value: 10 } },
  { slug: 'world-traveler', name: 'Viajante de Xícara', description: 'Cafés de 5 países diferentes', iconName: 'public', tier: 'GOLD', category: 'EXPLORER', rule: { type: 'country_count', value: 5 } },
  { slug: 'variety-hunter', name: 'Caçador de Variedades', description: '5 variedades diferentes', iconName: 'spa', tier: 'SILVER', category: 'EXPLORER', rule: { type: 'variety_count', value: 5 } },
  { slug: 'process-nerd', name: 'Nerd dos Processos', description: '4 métodos de processamento diferentes', iconName: 'biotech', tier: 'SILVER', category: 'EXPLORER', rule: { type: 'process_count', value: 4 } },

  // Connoisseur — taste & quality
  { slug: 'dark-roast-lover', name: 'Alma Escura', description: '10 check-ins com torra escura', iconName: 'dark_mode', tier: 'SILVER', category: 'CONNOISSEUR', rule: { type: 'roast_count', value: 10, filter: { roastColor: 'DARK' } } },
  { slug: 'light-roast-fan', name: 'Raro e Delicado', description: '10 check-ins com torra clara', iconName: 'wb_sunny', tier: 'SILVER', category: 'CONNOISSEUR', rule: { type: 'roast_count', value: 10, filter: { roastColor: 'LIGHT' } } },
  { slug: 'method-master', name: 'Mestre dos Métodos', description: '5 métodos de preparo diferentes', iconName: 'science', tier: 'SILVER', category: 'CONNOISSEUR', rule: { type: 'method_count', value: 5 } },
  { slug: 'critic', name: 'Crítico Exigente', description: '25 avaliações de 4,5★ ou mais', iconName: 'reviews', tier: 'GOLD', category: 'CONNOISSEUR', rule: { type: 'high_rating_count', value: 25, filter: { min: 45 } } },
  { slug: 'sca-connoisseur', name: 'Paladar Refinado', description: 'Provou 5 cafés com SCA 90+', iconName: 'diamond', tier: 'GOLD', category: 'CONNOISSEUR', rule: { type: 'sca_connoisseur', value: 5, filter: { min: 90 } } },
  { slug: 'photographer', name: 'Fotógrafo do Café', description: '20 check-ins com foto', iconName: 'photo_camera', tier: 'SILVER', category: 'CONNOISSEUR', rule: { type: 'photo_count', value: 20 } },

  // Dedication — habits, streaks, timing
  { slug: 'early-bird', name: 'Coruja Matinal', description: '5 check-ins antes das 8h', iconName: 'wb_twilight', tier: 'BRONZE', category: 'DEDICATION', rule: { type: 'early_bird', value: 5 } },
  { slug: 'night-owl', name: 'Coruja Noturna', description: '5 check-ins após as 22h', iconName: 'nightlight', tier: 'BRONZE', category: 'DEDICATION', rule: { type: 'night_owl', value: 5 } },
  { slug: 'weekend-warrior', name: 'Guerreiro de Fim de Semana', description: '10 check-ins no fim de semana', iconName: 'weekend', tier: 'BRONZE', category: 'DEDICATION', rule: { type: 'weekend_count', value: 10 } },
  { slug: 'streak-7', name: 'Ritual Semanal', description: 'Sequência de 7 dias com check-in', iconName: 'local_fire_department', tier: 'SILVER', category: 'DEDICATION', rule: { type: 'streak_days', value: 7 } },
  { slug: 'streak-30', name: 'Hábito de Ferro', description: 'Sequência de 30 dias com check-in', iconName: 'whatshot', tier: 'PLATINUM', category: 'DEDICATION', rule: { type: 'streak_days', value: 30 } },

  // Social
  { slug: 'social-brewer', name: 'Companhia de Café', description: 'Tem 5 amigos no 1Cup', iconName: 'group', tier: 'BRONZE', category: 'SOCIAL', rule: { type: 'friend_count', value: 5 } },
  { slug: 'super-connector', name: 'Superconector', description: 'Tem 25 amigos no 1Cup', iconName: 'groups', tier: 'GOLD', category: 'SOCIAL', rule: { type: 'friend_count', value: 25 } },
  { slug: 'curator', name: 'Curador', description: 'Segue 10 cafés ou torrefações', iconName: 'bookmark', tier: 'BRONZE', category: 'SOCIAL', rule: { type: 'follows_count', value: 10 } },
  { slug: 'conversationalist', name: 'Tagarela', description: 'Escreveu 25 comentários', iconName: 'forum', tier: 'SILVER', category: 'SOCIAL', rule: { type: 'comments_made', value: 25 } },
  { slug: 'crowd-favorite', name: 'Queridinho', description: 'Recebeu 50 curtidas', iconName: 'favorite', tier: 'GOLD', category: 'SOCIAL', rule: { type: 'likes_received', value: 50 } },
];

export async function seedBadges() {
  for (const b of BADGE_SEED) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: {
        name: b.name, description: b.description, iconName: b.iconName,
        tier: b.tier, category: b.category, rule: b.rule as unknown as Prisma.InputJsonValue,
      },
      create: {
        slug: b.slug, name: b.name, description: b.description, iconName: b.iconName,
        tier: b.tier, category: b.category, rule: b.rule as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
