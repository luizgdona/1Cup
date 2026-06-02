import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/authenticate';
import { listBadges, seedBadges } from './badges.service';

export async function badgeRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (_request, reply) => {
    return reply.send({ data: await listBadges() });
  });

  // Endpoint interno para popular badges no banco (chamar uma vez)
  app.post('/seed', async (_request, reply) => {
    await seedBadges();
    return reply.send({ data: { message: 'Badges semeados com sucesso.' } });
  });
}
