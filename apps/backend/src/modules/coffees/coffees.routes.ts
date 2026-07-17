import type { FastifyInstance } from 'fastify';
import { authenticate, requireVerified } from '../../shared/middlewares/authenticate';
import { createCoffeeSchema, listCoffeesSchema, createSuggestionSchema } from './coffees.schema';
import * as svc from './coffees.service';

export async function coffeeRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const q = listCoffeesSchema.safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: q.error.flatten().fieldErrors } });
    const result = await svc.listCoffees(q.data);
    return reply.send({ data: result.coffees, meta: { page: q.data.page, total: result.total } });
  });

  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return reply.send({ data: await svc.getCoffee(id) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'COFFEE_ERROR', message: err.message } });
    }
  });

  app.post('/', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const body = createCoffeeSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    const { sub } = request.user as { sub: string };
    try {
      return reply.status(201).send({ data: await svc.createCoffee(body.data, sub) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'COFFEE_ERROR', message: err.message } });
    }
  });

  app.post('/:id/label', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub, role } = request.user as { sub: string; role: string };
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: { code: 'NO_FILE', message: 'Nenhum arquivo enviado.' } });
    const buffer = await data.toBuffer();
    try {
      return reply.send({ data: await svc.uploadLabel(id, buffer, data.mimetype, { id: sub, role }) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'UPLOAD_ERROR', message: err.message } });
    }
  });

  app.post('/:id/suggestions', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createSuggestionSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    const { sub } = request.user as { sub: string };
    try {
      return reply.status(201).send({ data: await svc.createSuggestion(id, sub, body.data.payload) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'SUGGESTION_ERROR', message: err.message } });
    }
  });
}
