import type { FastifyInstance } from 'fastify';
import { authenticate, requireVerified } from '../../shared/middlewares/authenticate';
import { createRoasterySchema, listRoasteriesSchema } from './roasteries.schema';
import * as svc from './roasteries.service';

export async function roasteryRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const q = listRoasteriesSchema.safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: q.error.flatten().fieldErrors } });
    const { q: search, page, perPage } = q.data;
    const result = await svc.listRoasteries(search, page, perPage);
    return reply.send({ data: result.roasteries, meta: { page, total: result.total } });
  });

  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return reply.send({ data: await svc.getRoastery(id) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'ROASTERY_ERROR', message: err.message } });
    }
  });

  app.post('/', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const body = createRoasterySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    const { sub } = request.user as { sub: string };
    return reply.status(201).send({ data: await svc.createRoastery(body.data, sub) });
  });

  app.post('/:id/logo', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: { code: 'NO_FILE', message: 'Nenhum arquivo enviado.' } });

    const buffer = await data.toBuffer();
    try {
      return reply.send({ data: await svc.uploadLogo(id, buffer, data.mimetype) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'UPLOAD_ERROR', message: err.message } });
    }
  });
}
