import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { redis } from './config/redis';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // ── Plugins de segurança ──────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', env.S3_PUBLIC_URL],
      },
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

  // ── Documentação Swagger ──────────────────────────────────
  await app.register(swagger, {
    openapi: {
      info: {
        title: '1Cup API',
        description: 'API da rede social gamificada de consumo de café',
        version: '1.0.0',
      },
      tags: [
        { name: 'auth', description: 'Autenticação e sessão' },
        { name: 'users', description: 'Usuários e perfis' },
        { name: 'coffees', description: 'Catálogo de cafés' },
        { name: 'roasteries', description: 'Torrefações' },
        { name: 'producers', description: 'Produtores / fazendas' },
        { name: 'checkins', description: 'Check-ins' },
        { name: 'feed', description: 'Feed social' },
        { name: 'friends', description: 'Amizades' },
        { name: 'badges', description: 'Conquistas' },
        { name: 'admin', description: 'Painel administrativo' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'tag' },
  });

  // ── Rota de saúde ─────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  }));

  // ── Rotas da API (registradas nas próximas fases) ─────────
  // await app.register(authRoutes, { prefix: '/api/v1/auth' });
  // await app.register(userRoutes, { prefix: '/api/v1/users' });
  // ...

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
