import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { cleanDb, hashToken } from './helpers';

// These tests need a real PostgreSQL (and Redis) — skipped in the unit CI job
// via SKIP_DB_TESTS=true, run in the dedicated integration job.
const runDb = process.env.SKIP_DB_TESTS !== 'true';
const d = runDb ? describe : describe.skip;

const validUser = {
  username: 'barista_int',
  email: 'barista.int@cafe.com',
  password: 'SenhaSegura1',
  displayName: 'Barista Integration',
};

async function register(app: FastifyInstance, overrides: Partial<typeof validUser> = {}) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { ...validUser, ...overrides },
  });
}

d('auth integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await cleanDb();
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
  });

  beforeEach(async () => {
    await cleanDb();
    // Clear the Redis-backed rate-limit counters so per-route limits (e.g.
    // 5 registrations / 15 min) don't leak across tests.
    await redis.flushdb();
  });

  it('registers a new user (unverified) with a token pair', async () => {
    const res = await register(app);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.user.email).toBe(validUser.email);
    expect(body.data.user.isVerified).toBeFalsy();
    expect(typeof body.data.accessToken).toBe('string');
    expect(typeof body.data.refreshToken).toBe('string');
    // A verification token was created for the new user.
    const count = await prisma.emailVerificationToken.count();
    expect(count).toBe(1);
  });

  it('rejects a duplicate email/username with 409', async () => {
    await register(app);
    const res = await register(app);
    expect(res.statusCode).toBe(409);
  });

  it('rejects login with the wrong password (401) and accepts the right one', async () => {
    await register(app);
    const bad = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: validUser.email, password: 'wrongpass' },
    });
    expect(bad.statusCode).toBe(401);

    const ok = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: validUser.email, password: validUser.password },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data.accessToken).toBeTruthy();
  });

  it('blocks content creation until the email is verified (403), then allows after verify', async () => {
    const reg = await register(app);
    const accessToken = reg.json().data.accessToken;

    // Unverified → check-in creation is gated.
    const gated = await app.inject({
      method: 'POST', url: '/api/v1/checkins',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { coffeeId: 'clxxxxxxxxxxxxxxx0000000000', rating: 40 },
    });
    expect(gated.statusCode).toBe(403);
    expect(gated.json().error.code).toBe('VERIFICATION_REQUIRED');

    // Simulate the emailed token by inserting a known one, then verify.
    const user = await prisma.user.findUniqueOrThrow({ where: { email: validUser.email } });
    const raw = 'known-verification-token';
    await prisma.emailVerificationToken.create({
      data: { token: hashToken(raw), userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) },
    });

    const verify = await app.inject({
      method: 'POST', url: '/api/v1/auth/verify-email', payload: { token: raw },
    });
    expect(verify.statusCode).toBe(200);
    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.isVerified).toBe(true);
  });

  it('resets the password with a valid token and revokes existing sessions', async () => {
    const reg = await register(app);
    const oldRefresh = reg.json().data.refreshToken;
    const user = await prisma.user.findUniqueOrThrow({ where: { email: validUser.email } });

    const raw = 'known-reset-token';
    await prisma.passwordResetToken.create({
      data: { token: hashToken(raw), userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) },
    });

    const reset = await app.inject({
      method: 'POST', url: '/api/v1/auth/reset-password',
      payload: { token: raw, password: 'NovaSenha123' },
    });
    expect(reset.statusCode).toBe(200);

    // Old refresh token no longer works (all sessions revoked).
    const refresh = await app.inject({
      method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: oldRefresh },
    });
    expect(refresh.statusCode).toBe(401);

    // New password logs in.
    const login = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: validUser.email, password: 'NovaSenha123' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('rotates refresh tokens and detects reuse of a revoked token', async () => {
    const reg = await register(app);
    const firstRefresh = reg.json().data.refreshToken;

    const rotated = await app.inject({
      method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: firstRefresh },
    });
    expect(rotated.statusCode).toBe(200);

    // Replaying the now-revoked first token must fail (reuse detection).
    const replay = await app.inject({
      method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: firstRefresh },
    });
    expect(replay.statusCode).toBe(401);

    // And the family is revoked: the rotated token is now dead too.
    const rotatedToken = rotated.json().data.refreshToken;
    const afterFamilyRevoke = await app.inject({
      method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: rotatedToken },
    });
    expect(afterFamilyRevoke.statusCode).toBe(401);
  });
});
