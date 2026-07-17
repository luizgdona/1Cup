import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middlewares/authenticate';
import * as svc from './blocks.service';

const idParam = z.object({ id: z.string().cuid() });

// Mounted at /api/v1/blocks.
export async function blockRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    return reply.send({ data: await svc.listBlocks(sub) });
  });

  app.post('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
    try {
      return reply.status(201).send({ data: await svc.blockUser(sub, params.data.id) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'BLOCK_ERROR', message: err.message } });
    }
  });

  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
    return reply.send({ data: await svc.unblockUser(sub, params.data.id) });
  });
}
