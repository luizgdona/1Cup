import type { FastifyInstance } from 'fastify';
import { authenticate, requireVerified } from '../../shared/middlewares/authenticate';
import { createProducerSchema, listProducersSchema } from './producers.schema';
import * as svc from './producers.service';

export async function producerRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const q = listProducersSchema.safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: q.error.flatten().fieldErrors } });
    const { q: search, page, perPage } = q.data;
    const result = await svc.listProducers(search, page, perPage);
    return reply.send({ data: result.producers, meta: { page, total: result.total } });
  });

  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return reply.send({ data: await svc.getProducer(id) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'PRODUCER_ERROR', message: err.message } });
    }
  });

  app.post('/', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const body = createProducerSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    const { sub } = request.user as { sub: string };
    const producer = await svc.createProducer(body.data, sub);
    return reply.status(201).send({ data: producer });
  });
}
