import { prisma } from '../../config/database';

// ── Badge Engine ──────────────────────────────────────────
// Executado após cada check-in. Avalia todas as regras e
// concede badges ainda não conquistados pelo usuário.

interface BadgeRule {
  type: string;
  value: number;
  filter?: Record<string, unknown>;
}

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
    const rule = badge.rule as BadgeRule;
    const qualifies = await checkRule(userId, rule);
    if (qualifies) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      earned.push(badge.slug);
    }
  }

  return earned;
}

async function checkRule(userId: string, rule: BadgeRule): Promise<boolean> {
  switch (rule.type) {
    case 'checkin_count': {
      const count = await prisma.checkIn.count({ where: { userId } });
      return count >= rule.value;
    }

    case 'roast_count': {
      // filter: { roastColor: 'DARK' } ou { roastColor: 'LIGHT' }
      const count = await prisma.checkIn.count({
        where: {
          userId,
          coffee: { roastColor: (rule.filter?.roastColor as any) ?? undefined },
        },
      });
      return count >= rule.value;
    }

    case 'country_count': {
      // Cafés de N países diferentes
      const countries = await prisma.checkIn.findMany({
        where: { userId, coffee: { producer: { isNot: null } } },
        select: { coffee: { select: { producer: { select: { country: true } } } } },
        distinct: ['coffeeId'],
      });
      const uniqueCountries = new Set(
        countries
          .map((c) => c.coffee.producer?.country)
          .filter(Boolean),
      );
      return uniqueCountries.size >= rule.value;
    }

    case 'early_bird': {
      // Check-ins com createdAt hora < 8h
      const earlyCheckins = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM checkins
        WHERE user_id = ${userId}
        AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo') < 8
      `;
      return Number(earlyCheckins[0]?.count ?? 0) >= rule.value;
    }

    case 'method_count': {
      const methods = await prisma.checkIn.findMany({
        where: { userId, brewMethod: { not: null } },
        select: { brewMethod: true },
        distinct: ['brewMethod'],
      });
      return methods.length >= rule.value;
    }

    case 'variety_count': {
      const varieties = await prisma.checkIn.findMany({
        where: { userId, coffee: { variety: { not: null } } },
        select: { coffee: { select: { variety: true } } },
        distinct: ['coffeeId'],
      });
      const uniqueVarieties = new Set(varieties.map((c) => c.coffee.variety).filter(Boolean));
      return uniqueVarieties.size >= rule.value;
    }

    case 'friend_count': {
      const count = await prisma.friendship.count({
        where: { userId, status: 'ACCEPTED' },
      });
      return count >= rule.value;
    }

    default:
      return false;
  }
}

export async function listBadges() {
  return prisma.badge.findMany({ where: { isActive: true }, orderBy: { slug: 'asc' } });
}

export async function seedBadges() {
  const badges = [
    {
      slug: 'first-checkin',
      name: 'Primeira Xícara',
      description: 'Fez o primeiro check-in',
      iconName: 'coffee',
      rule: { type: 'checkin_count', value: 1 },
    },
    {
      slug: 'ten-checkins',
      name: 'Decafeinado não conta',
      description: 'Fez 10 check-ins',
      iconName: 'local_cafe',
      rule: { type: 'checkin_count', value: 10 },
    },
    {
      slug: 'fifty-checkins',
      name: 'Viciado em Cafeína',
      description: 'Fez 50 check-ins',
      iconName: 'bolt',
      rule: { type: 'checkin_count', value: 50 },
    },
    {
      slug: 'dark-roast-lover',
      name: 'Alma Escura',
      description: '10 check-ins com torra escura',
      iconName: 'dark_mode',
      rule: { type: 'roast_count', value: 10, filter: { roastColor: 'DARK' } },
    },
    {
      slug: 'light-roast-fan',
      name: 'Raro e Delicado',
      description: '10 check-ins com torra clara',
      iconName: 'wb_sunny',
      rule: { type: 'roast_count', value: 10, filter: { roastColor: 'LIGHT' } },
    },
    {
      slug: 'world-traveler',
      name: 'Viajante de Xícara',
      description: 'Bebeu cafés de 5 países diferentes',
      iconName: 'public',
      rule: { type: 'country_count', value: 5 },
    },
    {
      slug: 'early-bird',
      name: 'Coruja Matinal',
      description: '5 check-ins antes das 8h',
      iconName: 'wb_twilight',
      rule: { type: 'early_bird', value: 5 },
    },
    {
      slug: 'method-master',
      name: 'Mestre dos Métodos',
      description: 'Usou 5 métodos de preparo diferentes',
      iconName: 'science',
      rule: { type: 'method_count', value: 5 },
    },
    {
      slug: 'variety-hunter',
      name: 'Caçador de Variedades',
      description: 'Bebeu 5 variedades de café diferentes',
      iconName: 'search',
      rule: { type: 'variety_count', value: 5 },
    },
    {
      slug: 'social-brewer',
      name: 'Companhia de Café',
      description: 'Tem 5 amigos no 1Cup',
      iconName: 'group',
      rule: { type: 'friend_count', value: 5 },
    },
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: {},
      create: b,
    });
  }
}
