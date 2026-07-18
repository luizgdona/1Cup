import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middlewares/authenticate';
import * as svc from './engagement.service';

const leaderboardQuery = z.object({
  metric: z.enum(['checkins', 'badges']).default('checkins'),
  limit: z.coerce.number().int().min(1).max(50).catch(20).default(20),
});

const limitQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).catch(10).default(10),
});

// Mounted at /api/v1/engagement.
export async function engagementRoutes(app: FastifyInstance) {
  app.get('/leaderboard', { preHandler: authenticate }, async (request, reply) => {
    const q = leaderboardQuery.parse(request.query);
    return reply.send({ data: await svc.getLeaderboard(q.metric, q.limit) });
  });

  app.get('/recommendations', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const q = limitQuery.parse(request.query);
    return reply.send({ data: await svc.getRecommendations(sub, q.limit) });
  });

  app.get('/onboarding', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    return reply.send({ data: await svc.getOnboarding(sub) });
  });
}
