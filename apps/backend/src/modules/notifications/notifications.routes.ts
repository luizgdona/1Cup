import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middlewares/authenticate';
import * as svc from './notifications.service';

const cursorSchema = z.object({ cursor: z.string().max(40).optional() });
const idParam = z.object({ id: z.string().cuid() });

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications — cursor-paginated, newest first
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const q = cursorSchema.safeParse(request.query);
    const cursor = q.success ? q.data.cursor : undefined;
    const result = await svc.listNotifications(sub, cursor);
    return reply.send({ data: result.items, meta: { nextCursor: result.nextCursor, hasMore: result.hasMore } });
  });

  // GET /notifications/unread-count
  app.get('/unread-count', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    return reply.send({ data: { count: await svc.countUnread(sub) } });
  });

  // PATCH /notifications/read-all
  app.patch('/read-all', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    return reply.send({ data: await svc.markAllRead(sub) });
  });

  // PATCH /notifications/:id/read
  app.patch('/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
    return reply.send({ data: await svc.markRead(sub, params.data.id) });
  });
}
