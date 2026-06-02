import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/authenticate';
import * as svc from './feed.service';

export async function feedRoutes(app: FastifyInstance) {
  // GET /feed?cursor=<base64>
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { cursor } = request.query as { cursor?: string };
    const { sub } = request.user as { sub: string };
    const result = await svc.getFriendFeed(sub, cursor);
    return reply.send({ data: result.items, nextCursor: result.nextCursor, hasMore: result.hasMore });
  });

  // GET /feed/discover?cursor=<base64>
  app.get('/discover', { preHandler: authenticate }, async (request, reply) => {
    const { cursor } = request.query as { cursor?: string };
    const result = await svc.getDiscoverFeed(cursor);
    return reply.send({ data: result.items, nextCursor: result.nextCursor, hasMore: result.hasMore });
  });
}
