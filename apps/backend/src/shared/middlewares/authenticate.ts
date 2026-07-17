import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Token inválido ou expirado.' },
    });
  }
}

/**
 * Gate for actions that create public/social content. Must run AFTER
 * `authenticate` (relies on request.user). Rejects users whose email is not yet
 * verified with 403 VERIFICATION_REQUIRED so the client can prompt a resend.
 */
export async function requireVerified(request: FastifyRequest, reply: FastifyReply) {
  const { sub } = request.user as { sub: string };
  const user = await prisma.user.findUnique({ where: { id: sub }, select: { isVerified: true } });
  if (!user) {
    return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Usuário não encontrado.' } });
  }
  if (!user.isVerified) {
    return reply.status(403).send({
      error: { code: 'VERIFICATION_REQUIRED', message: 'Confirme seu e-mail para realizar esta ação.' },
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
