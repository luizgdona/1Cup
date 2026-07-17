import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as authService from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema';

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors },
      });
    }

    try {
      const result = await authService.register(body.data, app);
      return reply.status(201).send({ data: result });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({
        error: { code: 'REGISTER_ERROR', message: err.message },
      });
    }
  });

  // POST /auth/login
  app.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors },
      });
    }

    try {
      const result = await authService.login(body.data, app);
      return reply.send({ data: result });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({
        error: { code: 'LOGIN_ERROR', message: err.message },
      });
    }
  });

  // POST /auth/refresh
  app.post('/refresh', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors },
      });
    }

    try {
      const result = await authService.refresh(body.data.refreshToken, app);
      return reply.send({ data: result });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({
        error: { code: 'REFRESH_ERROR', message: err.message },
      });
    }
  });

  // POST /auth/forgot-password
  app.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const body = forgotPasswordSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors },
      });
    }
    const result = await authService.requestPasswordReset(body.data.email);
    return reply.send({ data: result });
  });

  // POST /auth/reset-password
  app.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const body = resetPasswordSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors },
      });
    }
    try {
      const result = await authService.resetPassword(body.data.token, body.data.password);
      return reply.send({ data: result });
    } catch (err: any) {
      return reply.status(err.statusCode ?? 500).send({
        error: { code: 'RESET_ERROR', message: err.message },
      });
    }
  });

  // POST /auth/logout
  app.post('/logout', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: body.error.flatten().fieldErrors },
      });
    }

    await authService.logout(body.data.refreshToken);
    return reply.status(204).send();
  });
}
