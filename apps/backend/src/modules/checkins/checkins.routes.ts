import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireVerified } from '../../shared/middlewares/authenticate';
import { createCheckinSchema, updateCheckinSchema } from './checkins.schema';
import * as svc from './checkins.service';
import * as likes from './likes.service';
import * as comments from '../comments/comments.service';
import { createCommentSchema, listCommentsSchema } from '../comments/comments.schema';

const idParam = z.object({ id: z.string().cuid() });

export async function checkinRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const body = createCheckinSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    const { sub } = request.user as { sub: string };
    try {
      return reply.status(201).send({ data: await svc.createCheckin(body.data, sub) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'CHECKIN_ERROR', message: err.message } });
    }
  });

  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = request.user as { sub: string };
    try {
      return reply.send({ data: await svc.getCheckin(id, sub) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'CHECKIN_ERROR', message: err.message } });
    }
  });

  app.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = request.user as { sub: string };
    const body = updateCheckinSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    try {
      return reply.send({ data: await svc.updateCheckin(id, sub, body.data) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'CHECKIN_ERROR', message: err.message } });
    }
  });

  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = request.user as { sub: string };
    try {
      await svc.deleteCheckin(id, sub);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'CHECKIN_ERROR', message: err.message } });
    }
  });

  app.post('/:id/photos', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = request.user as { sub: string };
    const parts = request.files();
    const files: Array<{ buffer: Buffer; mimetype: string }> = [];
    for await (const part of parts) {
      files.push({ buffer: await part.toBuffer(), mimetype: part.mimetype });
    }
    if (files.length === 0) return reply.status(400).send({ error: { code: 'NO_FILE', message: 'Nenhum arquivo enviado.' } });
    try {
      return reply.send({ data: await svc.addPhotos(id, sub, files) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'UPLOAD_ERROR', message: err.message } });
    }
  });

  // ── Likes ────────────────────────────────────────────────
  app.post('/:id/like', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
    try {
      return reply.send({ data: await likes.likeCheckin(params.data.id, sub) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'LIKE_ERROR', message: err.message } });
    }
  });

  app.delete('/:id/like', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
    return reply.send({ data: await likes.unlikeCheckin(params.data.id, sub) });
  });

  // ── Comments ─────────────────────────────────────────────
  app.get('/:id/comments', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
    const q = listCommentsSchema.parse(request.query);
    try {
      const result = await comments.listComments(params.data.id, sub, q.page, q.perPage);
      return reply.send({ data: result.comments, meta: { page: q.page, total: result.total } });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'COMMENT_ERROR', message: err.message } });
    }
  });

  app.post('/:id/comments', { preHandler: [authenticate, requireVerified] }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: params.error.flatten().fieldErrors } });
    const body = createCommentSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    try {
      return reply.status(201).send({ data: await comments.addComment(params.data.id, sub, body.data) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'COMMENT_ERROR', message: err.message } });
    }
  });
}
