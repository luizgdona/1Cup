import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { cleanDb, createVerifiedUser } from './helpers';

const runDb = process.env.SKIP_DB_TESTS !== 'true';
const d = runDb ? describe : describe.skip;

// End-to-end flow across the Phase 8 social features. Ordered steps share state.
d('phase 8 social features', () => {
  let app: FastifyInstance;
  let A: Awaited<ReturnType<typeof createVerifiedUser>>; // author
  let B: Awaited<ReturnType<typeof createVerifiedUser>>; // interactor
  let admin: Awaited<ReturnType<typeof createVerifiedUser>>;
  let roasteryId: string;
  let coffeeId: string;
  let checkinId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await cleanDb();
    await redis.flushdb();

    A = await createVerifiedUser(app, { username: 'author_a', email: 'a@cafe.com' });
    B = await createVerifiedUser(app, { username: 'inter_b', email: 'b@cafe.com' });
    admin = await createVerifiedUser(app, { username: 'admin_c', email: 'c@cafe.com', admin: true });

    const roastery = await app.inject({ method: 'POST', url: '/api/v1/roasteries', headers: A.auth, payload: { name: 'Mínimo Café' } });
    roasteryId = roastery.json().data.id;

    const coffee = await app.inject({ method: 'POST', url: '/api/v1/coffees', headers: A.auth, payload: { name: 'Bourbon Amarelo', roasteryId } });
    coffeeId = coffee.json().data.id;

    const checkin = await app.inject({ method: 'POST', url: '/api/v1/checkins', headers: A.auth, payload: { coffeeId, rating: 45 } });
    checkinId = checkin.json().data.id;
  });

  afterAll(async () => {
    await cleanDb();
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
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
    const report = await app.inject({
      method: 'POST', url: '/api/v1/reports', headers: B.auth,
      payload: { entityType: 'CHECKIN', entityId: checkinId, reason: 'SPAM' },
    });
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

    // B can no longer comment on A's check-in.
    const blockedComment = await app.inject({
      method: 'POST', url: `/api/v1/checkins/${checkinId}/comments`, headers: B.auth, payload: { body: 'oi' },
    });
    expect(blockedComment.statusCode).toBe(403);

    // A's search no longer returns B.
    const search = await app.inject({ method: 'GET', url: '/api/v1/friends/search?q=inter_b', headers: A.auth });
    expect(search.json().data.find((u: any) => u.id === B.id)).toBeUndefined();

    // Unblock restores interaction.
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
