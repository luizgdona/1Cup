import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { cleanDb, hashToken, createVerifiedUser } from './helpers';
import { seedBadges } from '../../modules/badges/badges.service';

// All integration tests live in ONE file so they share a single app + Postgres +
// Redis lifecycle. Vitest runs separate files in parallel workers, which would
// let their cleanDb() calls clobber a shared database — keeping everything here
// avoids that without disabling parallelism globally.
const runDb = process.env.SKIP_DB_TESTS !== 'true';
const d = runDb ? describe : describe.skip;

const validUser = {
  username: 'barista_int',
  email: 'barista.int@cafe.com',
  password: 'SenhaSegura1',
  displayName: 'Barista Integration',
};

d('API integration', () => {
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

  // ── Auth ─────────────────────────────────────────────────
  describe('auth', () => {
    beforeEach(async () => {
      await cleanDb();
      await redis.flushdb(); // reset per-route rate-limit counters between tests
    });

    const register = (overrides: Partial<typeof validUser> = {}) =>
      app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { ...validUser, ...overrides } });

    it('registers a new user (unverified) with a token pair', async () => {
      const res = await register();
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.data.user.email).toBe(validUser.email);
      expect(body.data.user.isVerified).toBeFalsy();
      expect(typeof body.data.accessToken).toBe('string');
      expect(typeof body.data.refreshToken).toBe('string');
      expect(await prisma.emailVerificationToken.count()).toBe(1);
    });

    it('rejects a duplicate email/username with 409', async () => {
      await register();
      expect((await register()).statusCode).toBe(409);
    });

    it('rejects login with the wrong password (401) and accepts the right one', async () => {
      await register();
      const bad = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: validUser.email, password: 'wrongpass' } });
      expect(bad.statusCode).toBe(401);
      const ok = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: validUser.email, password: validUser.password } });
      expect(ok.statusCode).toBe(200);
      expect(ok.json().data.accessToken).toBeTruthy();
    });

    it('blocks content creation until the email is verified (403), then allows after verify', async () => {
      const reg = await register();
      const accessToken = reg.json().data.accessToken;

      const gated = await app.inject({
        method: 'POST', url: '/api/v1/checkins',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { coffeeId: 'clxxxxxxxxxxxxxxx0000000000', rating: 40 },
      });
      expect(gated.statusCode).toBe(403);
      expect(gated.json().error.code).toBe('VERIFICATION_REQUIRED');

      const user = await prisma.user.findUniqueOrThrow({ where: { email: validUser.email } });
      const raw = 'known-verification-token';
      await prisma.emailVerificationToken.create({ data: { token: hashToken(raw), userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) } });

      const verify = await app.inject({ method: 'POST', url: '/api/v1/auth/verify-email', payload: { token: raw } });
      expect(verify.statusCode).toBe(200);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).isVerified).toBe(true);
    });

    it('resets the password with a valid token and revokes existing sessions', async () => {
      const reg = await register();
      const oldRefresh = reg.json().data.refreshToken;
      const user = await prisma.user.findUniqueOrThrow({ where: { email: validUser.email } });

      const raw = 'known-reset-token';
      await prisma.passwordResetToken.create({ data: { token: hashToken(raw), userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) } });

      const reset = await app.inject({ method: 'POST', url: '/api/v1/auth/reset-password', payload: { token: raw, password: 'NovaSenha123' } });
      expect(reset.statusCode).toBe(200);

      const refresh = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: oldRefresh } });
      expect(refresh.statusCode).toBe(401);

      const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: validUser.email, password: 'NovaSenha123' } });
      expect(login.statusCode).toBe(200);
    });

    it('rotates refresh tokens and detects reuse of a revoked token', async () => {
      const reg = await register();
      const firstRefresh = reg.json().data.refreshToken;

      const rotated = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: firstRefresh } });
      expect(rotated.statusCode).toBe(200);

      const replay = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: firstRefresh } });
      expect(replay.statusCode).toBe(401);

      const rotatedToken = rotated.json().data.refreshToken;
      const afterFamilyRevoke = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: rotatedToken } });
      expect(afterFamilyRevoke.statusCode).toBe(401);
    });
  });

  // ── Phase 8 social features (ordered, shared state) ──────
  describe('phase 8 social features', () => {
    let A: Awaited<ReturnType<typeof createVerifiedUser>>;
    let B: Awaited<ReturnType<typeof createVerifiedUser>>;
    let admin: Awaited<ReturnType<typeof createVerifiedUser>>;
    let roasteryId: string;
    let coffeeId: string;
    let checkinId: string;

    beforeAll(async () => {
      await cleanDb();
      await redis.flushdb();

      A = await createVerifiedUser(app, { username: 'author_a', email: 'a@cafe.com' });
      B = await createVerifiedUser(app, { username: 'inter_b', email: 'b@cafe.com' });
      admin = await createVerifiedUser(app, { username: 'admin_c', email: 'c@cafe.com', admin: true });

      roasteryId = (await app.inject({ method: 'POST', url: '/api/v1/roasteries', headers: A.auth, payload: { name: 'Mínimo Café' } })).json().data.id;
      coffeeId = (await app.inject({ method: 'POST', url: '/api/v1/coffees', headers: A.auth, payload: { name: 'Bourbon Amarelo', roasteryId } })).json().data.id;
      checkinId = (await app.inject({ method: 'POST', url: '/api/v1/checkins', headers: A.auth, payload: { coffeeId, rating: 45 } })).json().data.id;
    });

    it('lets B like A\'s check-in and notifies A', async () => {
      const like = await app.inject({ method: 'POST', url: `/api/v1/checkins/${checkinId}/like`, headers: B.auth });
      expect(like.statusCode).toBe(200);
      expect(like.json().data).toMatchObject({ liked: true, likeCount: 1 });

      const notifs = await app.inject({ method: 'GET', url: '/api/v1/notifications', headers: A.auth });
      expect(notifs.json().data.some((n: any) => n.type === 'LIKE')).toBe(true);
    });

    it('lets B comment and lists it', async () => {
      const c = await app.inject({ method: 'POST', url: `/api/v1/checkins/${checkinId}/comments`, headers: B.auth, payload: { body: 'Top demais!' } });
      expect(c.statusCode).toBe(201);
      const list = await app.inject({ method: 'GET', url: `/api/v1/checkins/${checkinId}/comments`, headers: A.auth });
      expect(list.json().data).toHaveLength(1);
      expect(list.json().data[0].body).toBe('Top demais!');
    });

    it('shows like/comment counts in the discover feed for B', async () => {
      const feed = await app.inject({ method: 'GET', url: '/api/v1/feed/discover', headers: B.auth });
      const item = feed.json().data.find((c: any) => c.id === checkinId);
      expect(item.likeCount).toBe(1);
      expect(item.commentCount).toBe(1);
      expect(item.likedByMe).toBe(true);
    });

    it('lets B follow the coffee and roastery', async () => {
      await app.inject({ method: 'POST', url: `/api/v1/follows/coffees/${coffeeId}`, headers: B.auth });
      await app.inject({ method: 'POST', url: `/api/v1/follows/roasteries/${roasteryId}`, headers: B.auth });
      const follows = await app.inject({ method: 'GET', url: '/api/v1/follows', headers: B.auth });
      expect(follows.json().data.coffees).toHaveLength(1);
      expect(follows.json().data.roasteries).toHaveLength(1);
    });

    it('notifies followers when a new coffee is added to a followed roastery', async () => {
      await app.inject({ method: 'POST', url: '/api/v1/coffees', headers: A.auth, payload: { name: 'Catuaí Vermelho', roasteryId } });
      const notifs = await app.inject({ method: 'GET', url: '/api/v1/notifications', headers: B.auth });
      expect(notifs.json().data.some((n: any) => n.type === 'NEW_COFFEE')).toBe(true);
    });

    it('lets B report the check-in and an admin see it', async () => {
      const report = await app.inject({ method: 'POST', url: '/api/v1/reports', headers: B.auth, payload: { entityType: 'CHECKIN', entityId: checkinId, reason: 'SPAM' } });
      expect(report.statusCode).toBe(201);
      const list = await app.inject({ method: 'GET', url: '/api/v1/admin/reports', headers: admin.auth });
      expect(list.statusCode).toBe(200);
      expect(list.json().data.length).toBeGreaterThanOrEqual(1);
    });

    it('blocks a non-admin from the admin reports endpoint', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/admin/reports', headers: B.auth });
      expect(res.statusCode).toBe(403);
    });

    it('enforces blocking: A blocks B, then B cannot interact and is hidden from search', async () => {
      const block = await app.inject({ method: 'POST', url: `/api/v1/blocks/${B.id}`, headers: A.auth });
      expect(block.statusCode).toBe(201);

      const blockedComment = await app.inject({ method: 'POST', url: `/api/v1/checkins/${checkinId}/comments`, headers: B.auth, payload: { body: 'oi' } });
      expect(blockedComment.statusCode).toBe(403);

      const search = await app.inject({ method: 'GET', url: '/api/v1/friends/search?q=inter_b', headers: A.auth });
      expect(search.json().data.find((u: any) => u.id === B.id)).toBeUndefined();

      const unblock = await app.inject({ method: 'DELETE', url: `/api/v1/blocks/${B.id}`, headers: A.auth });
      expect(unblock.statusCode).toBe(200);
    });

    it('marks notifications as read', async () => {
      const before = await app.inject({ method: 'GET', url: '/api/v1/notifications/unread-count', headers: A.auth });
      expect(before.json().data.count).toBeGreaterThan(0);
      await app.inject({ method: 'PATCH', url: '/api/v1/notifications/read-all', headers: A.auth });
      const after = await app.inject({ method: 'GET', url: '/api/v1/notifications/unread-count', headers: A.auth });
      expect(after.json().data.count).toBe(0);
    });
  });

  // ── Phase 9 engagement & badges (ordered, shared state) ──
  describe('phase 9 engagement & badges', () => {
    let U: Awaited<ReturnType<typeof createVerifiedUser>>;
    let roasteryId: string;

    beforeAll(async () => {
      await cleanDb();
      await redis.flushdb();
      await seedBadges();

      U = await createVerifiedUser(app, { username: 'eng_u', email: 'eng@cafe.com' });
      roasteryId = (await app.inject({ method: 'POST', url: '/api/v1/roasteries', headers: U.auth, payload: { name: 'Isso é Café' } })).json().data.id;
      const coffeeId = (await app.inject({ method: 'POST', url: '/api/v1/coffees', headers: U.auth, payload: { name: 'Geisha', roasteryId } })).json().data.id;
      await app.inject({ method: 'POST', url: '/api/v1/checkins', headers: U.auth, payload: { coffeeId, rating: 50 } });
      // Deterministic evaluation (createCheckin evaluates in the background).
      await app.inject({ method: 'POST', url: '/api/v1/badges/evaluate', headers: U.auth });
    });

    it('exposes a large, categorized badge catalog', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/badges', headers: U.auth });
      expect(res.json().data.length).toBeGreaterThanOrEqual(25);
      expect(res.json().data.some((b: any) => b.tier && b.category)).toBe(true);
    });

    it('awards the first-checkin badge and sends a BADGE_EARNED notification', async () => {
      const badges = await app.inject({ method: 'GET', url: '/api/v1/users/eng_u/badges', headers: U.auth });
      expect(badges.json().data.some((b: any) => b.badge.slug === 'first-checkin')).toBe(true);

      const notifs = await app.inject({ method: 'GET', url: '/api/v1/notifications', headers: U.auth });
      expect(notifs.json().data.some((n: any) => n.type === 'BADGE_EARNED')).toBe(true);
    });

    it('reports a current + longest streak of at least 1', async () => {
      const s = await app.inject({ method: 'GET', url: '/api/v1/badges/streak', headers: U.auth });
      expect(s.json().data.current).toBeGreaterThanOrEqual(1);
      expect(s.json().data.longest).toBeGreaterThanOrEqual(1);
    });

    it('ranks the user on the check-ins leaderboard', async () => {
      const lb = await app.inject({ method: 'GET', url: '/api/v1/engagement/leaderboard?metric=checkins', headers: U.auth });
      const row = lb.json().data.find((r: any) => r.user.id === U.id);
      expect(row).toBeDefined();
      expect(row.score).toBeGreaterThanOrEqual(1);
    });

    it('returns onboarding progress reflecting the completed steps', async () => {
      const ob = await app.inject({ method: 'GET', url: '/api/v1/engagement/onboarding', headers: U.auth });
      expect(ob.json().data.steps.firstCheckin).toBe(true);
      expect(ob.json().data.steps.verifyEmail).toBe(true);
    });

    it('recommends a coffee the user has not checked in yet', async () => {
      await app.inject({ method: 'POST', url: '/api/v1/coffees', headers: U.auth, payload: { name: 'Catuaí', roasteryId } });
      const rec = await app.inject({ method: 'GET', url: '/api/v1/engagement/recommendations', headers: U.auth });
      expect(Array.isArray(rec.json().data)).toBe(true);
      expect(rec.json().data.some((c: any) => c.name === 'Catuaí')).toBe(true);
    });

    it('requires admin to seed badges', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/v1/badges/seed', headers: U.auth });
      expect(res.statusCode).toBe(403);
    });
  });
});
