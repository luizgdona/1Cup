import type { FastifyInstance } from 'fastify';
import { authenticate, authenticateAdmin } from '../../shared/middlewares/authenticate';
import { listBadges, seedBadges, computeStreak, evaluateBadges } from './badges.service';

export async function badgeRoutes(app: FastifyInstance) {
  // Full badge catalog (grouped by category/tier on the client).
  app.get('/', { preHandler: authenticate }, async (_request, reply) => {
    return reply.send({ data: await listBadges() });
  });

  // Current + longest check-in streak for the authenticated user.
  app.get('/streak', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    return reply.send({ data: await computeStreak(sub) });
  });

  // Force a re-evaluation (e.g. after backfilling data) for the current user.
  app.post('/evaluate', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    return reply.send({ data: { earned: await evaluateBadges(sub) } });
  });

  // Admin-only: (re)seed the badge catalog. Previously this was public — a
  // write endpoint with no auth. Now restricted to admins.
  app.post('/seed', { preHandler: authenticateAdmin }, async (_request, reply) => {
    await seedBadges();
    return reply.send({ data: { message: 'Badges semeados com sucesso.' } });
  });
}
