import { createHash } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';

/** Same hashing the auth service uses for tokens at rest (SHA-256 hex). */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Registers a user, marks them verified (so content-creation gates pass), and
 * returns their id + a usable bearer token. Optionally promotes to ADMIN.
 */
export async function createVerifiedUser(
  app: FastifyInstance,
  opts: { username: string; email: string; admin?: boolean },
): Promise<{ id: string; token: string; auth: { authorization: string } }> {
  const password = 'SenhaSegura1';
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { username: opts.username, email: opts.email, password, displayName: opts.username },
  });
  const body = res.json();
  const id = body.data.user.id as string;
  let token = body.data.accessToken as string;

  await prisma.user.update({
    where: { id },
    data: { isVerified: true, ...(opts.admin ? { role: 'ADMIN' } : {}) },
  });

  // The register token embeds the role at signup (USER). After promoting to
  // ADMIN we must mint a fresh token so its `role` claim reflects the change.
  if (opts.admin) {
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: opts.email, password } });
    token = login.json().data.accessToken as string;
  }

  return { id, token, auth: { authorization: `Bearer ${token}` } };
}

/**
 * Removes all rows this suite may create. Ordered to respect FKs for relations
 * that use Restrict/NoAction (e.g. checkins → coffees → roasteries) or don't
 * cascade from User (friendships).
 */
export async function cleanDb(): Promise<void> {
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.block.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.checkInLike.deleteMany();
  await prisma.editSuggestion.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.coffee.deleteMany();
  await prisma.producer.deleteMany();
  await prisma.roastery.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}
