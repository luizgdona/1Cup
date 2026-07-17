import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/authenticate';
import { updateProfileSchema, changePasswordSchema } from './users.schema';
import { paginationSchema } from '../../shared/utils/pagination.schema';
import * as usersService from './users.service';

export async function userRoutes(app: FastifyInstance) {
  // GET /users/me
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    try {
      return reply.send({ data: await usersService.getMe(sub) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'USER_ERROR', message: err.message } });
    }
  });

  // PATCH /users/me
  app.patch('/me', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const body = updateProfileSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    }
    try {
      return reply.send({ data: await usersService.updateProfile(sub, body.data) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'USER_ERROR', message: err.message } });
    }
  });

  // PATCH /users/me/password
  app.patch('/me/password', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const body = changePasswordSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    }
    try {
      await usersService.changePassword(sub, body.data);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'USER_ERROR', message: err.message } });
    }
  });

  // DELETE /users/me
  app.delete('/me', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    await usersService.deleteAccount(sub);
    return reply.status(204).send();
  });

  // GET /users/:username
  app.get('/:username', { preHandler: authenticate }, async (request, reply) => {
    const { username } = request.params as { username: string };
    try {
      return reply.send({ data: await usersService.getByUsername(username) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'USER_ERROR', message: err.message } });
    }
  });

  // GET /users/:username/checkins
  app.get('/:username/checkins', { preHandler: authenticate }, async (request, reply) => {
    const { username } = request.params as { username: string };
    const { page, perPage } = paginationSchema.parse(request.query);
    try {
      const result = await usersService.getUserCheckins(username, page, perPage);
      return reply.send({ data: result.checkins, meta: { page, total: result.total } });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'USER_ERROR', message: err.message } });
    }
  });

  // GET /users/:username/badges
  app.get('/:username/badges', { preHandler: authenticate }, async (request, reply) => {
    const { username } = request.params as { username: string };
    try {
      return reply.send({ data: await usersService.getUserBadges(username) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'USER_ERROR', message: err.message } });
    }
  });

  // GET /users/:username/stats
  app.get('/:username/stats', { preHandler: authenticate }, async (request, reply) => {
    const { username } = request.params as { username: string };
    try {
      return reply.send({ data: await usersService.getUserStats(username) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'USER_ERROR', message: err.message } });
    }
  });
}
