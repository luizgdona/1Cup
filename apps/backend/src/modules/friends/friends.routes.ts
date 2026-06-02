import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/authenticate';
import { respondRequestSchema, searchUsersSchema } from './friends.schema';
import * as svc from './friends.service';

export async function friendRoutes(app: FastifyInstance) {
  // GET /friends — lista amigos confirmados
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    return reply.send({ data: await svc.listFriends(sub) });
  });

  // GET /friends/requests — solicitações recebidas + enviadas
  app.get('/requests', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    return reply.send({ data: await svc.listPendingRequests(sub) });
  });

  // GET /friends/search?q=
  app.get('/search', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const q = searchUsersSchema.safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: q.error.flatten().fieldErrors } });
    const result = await svc.searchUsers(q.data.q, sub, q.data.page, q.data.perPage);
    return reply.send({ data: result.users, meta: { page: q.data.page, total: result.total } });
  });

  // GET /friends/status/:userId — relação com outro usuário
  app.get('/status/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const { userId } = request.params as { userId: string };
    return reply.send({ data: { status: await svc.getFriendshipStatus(sub, userId) } });
  });

  // POST /friends/request/:userId — enviar solicitação
  app.post('/request/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const { userId } = request.params as { userId: string };
    try {
      return reply.status(201).send({ data: await svc.sendRequest(sub, userId) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'FRIEND_ERROR', message: err.message } });
    }
  });

  // PATCH /friends/request/:userId — aceitar ou rejeitar (o :userId é quem enviou)
  app.patch('/request/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const { userId } = request.params as { userId: string };
    const body = respondRequestSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors } });
    try {
      return reply.send({ data: await svc.respondRequest(userId, sub, body.data.action) });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({ error: { code: 'FRIEND_ERROR', message: err.message } });
    }
  });

  // DELETE /friends/:userId — remover amizade
  app.delete('/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const { userId } = request.params as { userId: string };
    await svc.removeFriend(sub, userId);
    return reply.status(204).send();
  });
}
