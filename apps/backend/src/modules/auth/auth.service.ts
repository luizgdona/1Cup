import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import type { RegisterInput, LoginInput } from './auth.schema';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function refreshTokenExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return d;
}

export async function register(input: RegisterInput, app: FastifyInstance) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    const field = existing.email === input.email ? 'e-mail' : 'username';
    throw { statusCode: 409, message: `Este ${field} já está em uso.` };
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  });

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role, app);
  return { user, accessToken, refreshToken };
}

export async function login(input: LoginInput, app: FastifyInstance) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw { statusCode: 401, message: 'Credenciais inválidas.' };
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw { statusCode: 401, message: 'Credenciais inválidas.' };
  }

  const { passwordHash: _, ...safeUser } = user;
  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role, app);
  return { user: safeUser, accessToken, refreshToken };
}

export async function refresh(rawRefreshToken: string, app: FastifyInstance) {
  const tokenHash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
    include: {
      user: {
        select: { id: true, username: true, email: true, displayName: true, avatarUrl: true, role: true },
      },
    },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw { statusCode: 401, message: 'Refresh token inválido ou expirado.' };
  }

  // Rotacionar: revogar o atual
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const { accessToken, refreshToken } = await issueTokenPair(stored.user.id, stored.user.role, app);
  return { user: stored.user, accessToken, refreshToken };
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { token: tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ── helpers ───────────────────────────────────────────────────

async function issueTokenPair(userId: string, role: string, app: FastifyInstance) {
  const accessToken = app.jwt.sign(
    { sub: userId, role },
    { expiresIn: '15m' }
  );

  const rawRefresh = randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawRefresh);

  await prisma.refreshToken.create({
    data: {
      token: tokenHash,
      userId,
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  return { accessToken, refreshToken: rawRefresh };
}
