import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';

const schema = z.object({
  name:  z.string().min(1).max(80),
  email: z.string().email(),
});

export async function waitlistRoutes(app: FastifyInstance) {
  app.post('/', {
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors },
      });
    }

    try {
      await prisma.waitlist.create({ data: body.data });
      return reply.status(201).send({ data: { message: 'Cadastrado com sucesso!' } });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return reply.status(409).send({
          error: { code: 'ALREADY_REGISTERED', message: 'Este e-mail já está na lista.' },
        });
      }
      throw err;
    }
  });
}
