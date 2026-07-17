import type { FastifyInstance } from 'fastify';
import { authenticateAdmin } from '../../shared/middlewares/authenticate';
import { reviewSuggestionSchema, listSuggestionsSchema, listUsersSchema, updateUserRoleSchema } from './admin.schema';
import * as svc from './admin.service';

export async function adminRoutes(app: FastifyInstance) {
  // GET /admin/metrics
  app.get('/metrics', { preHandler: authenticateAdmin }, async (_req, reply) => {
    return reply.send({ data: await svc.getMetrics() });
  });

  // GET /admin/suggestions?status=PENDING
  app.get('/suggestions', { preHandler: authenticateAdmin }, async (request, reply) => {
    const q = listSuggestionsSchema.safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: q.error.flatten().fieldErrors } });
    const result = await svc.listSuggestions(q.data);
    return reply.send({ data: result.suggestions, meta: { page: q.data.page, total: result.total } });
  });

  // PATCH /admin/suggestions/:id
  app.patch('/suggestions/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = request.user as { sub: string };
    const body = reviewSuggestionSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    try {
      return reply.send({ data: await svc.reviewSuggestion(id, sub, body.data) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'ADMIN_ERROR', message: err.message } });
    }
  });

  // GET /admin/users?q=&page=
  app.get('/users', { preHandler: authenticateAdmin }, async (request, reply) => {
    const parsed = listUsersSchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.flatten().fieldErrors } });
    const { q, page, perPage } = parsed.data;
    const result = await svc.listUsers(page, perPage, q);
    return reply.send({ data: result.users, meta: { page, total: result.total } });
  });

  // PATCH /admin/users/:id/role
  app.patch('/users/:id/role', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = request.user as { sub: string };
    const body = updateUserRoleSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    try {
      return reply.send({ data: await svc.updateUserRole(id, body.data, sub) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'ADMIN_ERROR', message: err.message } });
    }
  });
}
