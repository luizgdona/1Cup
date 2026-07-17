import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, authenticateAdmin } from '../../shared/middlewares/authenticate';
import { createReportSchema, listReportsSchema, reviewReportSchema } from './reports.schema';
import * as svc from './reports.service';

const idParam = z.object({ id: z.string().cuid() });

// User-facing report submission, mounted at /api/v1/reports.
export async function reportRoutes(app: FastifyInstance) {
  app.post('/', {
    preHandler: [authenticate],
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const body = createReportSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    try {
      return reply.status(201).send({ data: await svc.createReport(sub, body.data) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'REPORT_ERROR', message: err.message } });
    }
  });
}

// Admin moderation, mounted at /api/v1/admin/reports.
export async function adminReportRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticateAdmin }, async (request, reply) => {
    const q = listReportsSchema.safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: q.error.flatten().fieldErrors } });
    const result = await svc.listReports(q.data);
    return reply.send({ data: result.reports, meta: { page: q.data.page, total: result.total } });
  });

  app.patch('/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
    const body = reviewReportSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    try {
      return reply.send({ data: await svc.reviewReport(params.data.id, sub, body.data) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'REPORT_ERROR', message: err.message } });
    }
  });
}
