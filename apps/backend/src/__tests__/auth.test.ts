import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

// Testes de integração — requerem .env configurado com banco real.
// Para CI sem banco, os testes são pulados via SKIP_DB_TESTS=true.

const skip = process.env.SKIP_DB_TESTS === 'true';

describe('Auth — happy path', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let refreshToken: string;
  const testUser = {
    username: `test_${Date.now()}`,
    email: `test_${Date.now()}@1cup.test`,
    password: 'SenhaSegura123!',
    displayName: 'Test User',
  };

  beforeAll(async () => {
    if (skip) return;
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (skip) return;
    await app.close();
  });

  it.skipIf(skip)('POST /api/v1/auth/register — cria conta', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      body: testUser,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.user.username).toBe(testUser.username);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
    accessToken  = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  it.skipIf(skip)('POST /api/v1/auth/register — rejeita username duplicado', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      body: testUser,
    });
    expect(res.statusCode).toBe(409);
  });

  it.skipIf(skip)('POST /api/v1/auth/login — retorna tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email: testUser.email, password: testUser.password },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.accessToken).toBeTruthy();
    accessToken  = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  it.skipIf(skip)('POST /api/v1/auth/login — rejeita senha errada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email: testUser.email, password: 'errada' },
    });
    expect(res.statusCode).toBe(401);
  });

  it.skipIf(skip)('GET /api/v1/users/me — retorna perfil com token válido', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.username).toBe(testUser.username);
  });

  it.skipIf(skip)('GET /api/v1/users/me — rejeita sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users/me' });
    expect(res.statusCode).toBe(401);
  });

  it.skipIf(skip)('POST /api/v1/auth/refresh — renova tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      body: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.accessToken).toBeTruthy();
  });

  it.skipIf(skip)('POST /api/v1/auth/logout — revoga refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      body: { refreshToken },
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('Waitlist', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    if (skip) return;
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (skip) return;
    await app.close();
  });

  it.skipIf(skip)('POST /api/v1/waitlist — cadastra e-mail', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/waitlist',
      body: { name: 'Barista Test', email: `waitlist_${Date.now()}@test.com` },
    });
    expect(res.statusCode).toBe(201);
  });
});
