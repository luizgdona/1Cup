import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireVerified } from '../../shared/middlewares/authenticate';
import * as svc from './follows.service';

const idParam = z.object({ id: z.string().cuid() });

// Mounted at /api/v1/follows. Coffee/roastery follow toggles + my follow list.
export async function followRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    return reply.send({ data: await svc.listMyFollows(sub) });
  });

  const handle = (fn: (userId: string, id: string) => Promise<unknown>, code: string) =>
    async (request: any, reply: any) => {
      const { sub } = request.user as { sub: string };
      const params = idParam.safeParse(request.params);
      if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
      try {
        return reply.send({ data: await fn(sub, params.data.id) });
      } catch (err: any) {
        return reply.status(err.statusCode ?? 500).send({ error: { code, message: err.message } });
      }
    };

  app.post('/coffees/:id',   { preHandler: [authenticate, requireVerified] }, handle(svc.followCoffee, 'FOLLOW_ERROR'));
  app.delete('/coffees/:id', { preHandler: authenticate }, handle(svc.unfollowCoffee, 'FOLLOW_ERROR'));
  app.post('/roasteries/:id',   { preHandler: [authenticate, requireVerified] }, handle(svc.followRoastery, 'FOLLOW_ERROR'));
  app.delete('/roasteries/:id', { preHandler: authenticate }, handle(svc.unfollowRoastery, 'FOLLOW_ERROR'));
}
