import type { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Token inválido ou expirado.' },
    });
  }
}

export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user as { role: string };
    if (payload.role !== 'ADMIN') {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Acesso restrito a administradores.' },
      });
    }
  } catch {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Token inválido ou expirado.' },
    });
  }
}
