import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { redis } from './config/redis';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/users.routes';
import { producerRoutes } from './modules/producers/producers.routes';
import { roasteryRoutes } from './modules/roasteries/roasteries.routes';
import { coffeeRoutes } from './modules/coffees/coffees.routes';
import { checkinRoutes } from './modules/checkins/checkins.routes';
import { feedRoutes } from './modules/feed/feed.routes';
import { badgeRoutes } from './modules/badges/badges.routes';

export async function buildApp() {
  const app = Fastify({ logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' } });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', env.S3_PUBLIC_URL] },
    },
  });
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Aguarde um momento.' },
    }),
  });
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
  await app.register(swagger, {
    openapi: {
      info: { title: '1Cup API', description: 'Rede social de café especial', version: '1.0.0' },
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'tag' } });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await app.register(authRoutes,     { prefix: '/api/v1/auth' });
  await app.register(userRoutes,     { prefix: '/api/v1/users' });
  await app.register(producerRoutes, { prefix: '/api/v1/producers' });
  await app.register(roasteryRoutes, { prefix: '/api/v1/roasteries' });
  await app.register(coffeeRoutes,   { prefix: '/api/v1/coffees' });
  await app.register(checkinRoutes,  { prefix: '/api/v1/checkins' });
  await app.register(feedRoutes,     { prefix: '/api/v1/feed' });
  await app.register(badgeRoutes,    { prefix: '/api/v1/badges' });

  return app;
}

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 API rodando em http://localhost:${env.PORT}`);
    console.log(`📚 Docs em http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
