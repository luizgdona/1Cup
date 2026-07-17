import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/users.routes';
import { producerRoutes } from './modules/producers/producers.routes';
import { roasteryRoutes } from './modules/roasteries/roasteries.routes';
import { coffeeRoutes } from './modules/coffees/coffees.routes';
import { checkinRoutes } from './modules/checkins/checkins.routes';
import { feedRoutes } from './modules/feed/feed.routes';
import { badgeRoutes } from './modules/badges/badges.routes';
import { friendRoutes } from './modules/friends/friends.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { waitlistRoutes } from './modules/waitlist/waitlist.routes';

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
    // Fastify 5: trustProxy needed for accurate req.ip behind a load balancer
    trustProxy: env.NODE_ENV === 'production',
    // Cap JSON/urlencoded body size (defends against oversized-payload DoS).
    // Multipart uploads are handled separately by @fastify/multipart limits.
    bodyLimit: 256 * 1024, // 256 KB
  });

  // ── Security ─────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', env.S3_PUBLIC_URL] },
    },
    // Enforce HTTPS for a year (only meaningful in production behind TLS).
    hsts: env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  });

  await app.register(cors, {
    // Trim whitespace so "a, b" in CORS_ORIGIN still matches exactly.
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Rate limiting — in-memory store (fine for single instance dev/staging).
  // For multi-instance production, configure a Redis store via @fastify/rate-limit's
  // `store` option with a custom RedisStore implementation.
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip ?? 'unknown',
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment.' },
    }),
  });

  // ── Auth ─────────────────────────────────────────────────
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });

  // ── File upload ──────────────────────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB per file
      files: 3,                  // never buffer more than 3 files per request
      fields: 10,                // cap non-file fields
      fieldSize: 1024 * 100,     // 100 KB per text field
    },
  });

  // ── API Docs ─────────────────────────────────────────────
  // Only expose the interactive docs outside production. In production the
  // OpenAPI surface (route map, schemas) is unnecessary attack-surface.
  if (env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: { title: '1Cup API', description: '1Cup — Gamified specialty coffee social network', version: '1.0.0' },
        components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
      },
    });
    await app.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list' } });
  }

  // ── Global error handler ─────────────────────────────────
  // Guarantees a consistent { error: { code, message } } shape and, crucially,
  // never leaks stack traces or internal error messages to clients on 5xx.
  app.setErrorHandler((error, request, reply) => {
    // Services throw plain objects `{ statusCode, message }`; Fastify raises
    // FastifyError. Normalize both through a permissive shape.
    const err = error as { statusCode?: number; message?: string; code?: string; validation?: unknown };
    const statusCode = err.statusCode ?? 500;

    // Validation errors raised by Fastify's own schema layer
    if (err.validation) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Requisição inválida.' },
      });
    }

    if (statusCode >= 500) {
      // Log the real error server-side only.
      request.log.error(error);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno. Tente novamente.' },
      });
    }

    // Client errors (4xx) may surface their message.
    return reply.status(statusCode).send({
      error: { code: err.code ?? 'REQUEST_ERROR', message: err.message ?? 'Erro na requisição.' },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' } });
  });

  // ── Health ────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }));

  // ── Routes ───────────────────────────────────────────────
  await app.register(authRoutes,     { prefix: '/api/v1/auth' });
  await app.register(userRoutes,     { prefix: '/api/v1/users' });
  await app.register(producerRoutes, { prefix: '/api/v1/producers' });
  await app.register(roasteryRoutes, { prefix: '/api/v1/roasteries' });
  await app.register(coffeeRoutes,   { prefix: '/api/v1/coffees' });
  await app.register(checkinRoutes,  { prefix: '/api/v1/checkins' });
  await app.register(feedRoutes,     { prefix: '/api/v1/feed' });
  await app.register(badgeRoutes,    { prefix: '/api/v1/badges' });
  await app.register(friendRoutes,   { prefix: '/api/v1/friends' });
  await app.register(adminRoutes,    { prefix: '/api/v1/admin' });
  await app.register(waitlistRoutes, { prefix: '/api/v1/waitlist' });

  return app;
}

async function main() {
  const app = await buildApp();
  try {
    const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 API running at ${address}`);
    console.log(`📚 Swagger docs at ${address}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
