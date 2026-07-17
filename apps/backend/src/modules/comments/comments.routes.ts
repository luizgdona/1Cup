import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middlewares/authenticate';
import * as svc from './comments.service';

const idParam = z.object({ id: z.string().cuid() });

// Standalone route for deleting a comment by its own id.
export async function commentRoutes(app: FastifyInstance) {
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { sub, role } = request.user as { sub: string; role: string };
    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
    try {
      await svc.deleteComment(params.data.id, { id: sub, role });
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'COMMENT_ERROR', message: err.message } });
    }
  });
}
