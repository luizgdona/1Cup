import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { sendMail } from '../../shared/utils/mailer';
import type { RegisterInput, LoginInput } from './auth.schema';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const RESET_TOKEN_EXPIRY_MINUTES = 60;

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

  if (!stored || stored.expiresAt < new Date()) {
    throw { statusCode: 401, message: 'Refresh token inválido ou expirado.' };
  }

  // Reuse detection: a token that was already rotated (revoked) is being
  // presented again. This is a strong signal the token was stolen — revoke the
  // entire family so neither the attacker nor the victim can keep using it.
  if (stored.revokedAt) {
    await revokeAllUserTokens(stored.userId);
    throw { statusCode: 401, message: 'Sessão invalidada por segurança. Faça login novamente.' };
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

// ── Password reset ────────────────────────────────────────────

/**
 * Starts a password reset. Always resolves the same way regardless of whether
 * the email exists (prevents account enumeration). Sends a single-use, hashed,
 * short-lived token by email.
 */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  // Silent no-op for unknown emails — same externally observable behavior.
  if (user) {
    // Invalidate any previous unused tokens for this user.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60_000);

    await prisma.passwordResetToken.create({
      data: { token: hashToken(rawToken), userId: user.id, expiresAt },
    });

    const resetUrl = `${env.CORS_ORIGIN.split(',')[0].trim()}/reset-password?token=${rawToken}`;
    await sendMail({
      to: email,
      subject: '1Cup — Redefinição de senha',
      text: `Recebemos um pedido para redefinir sua senha.\n\nAbra o link abaixo (válido por ${RESET_TOKEN_EXPIRY_MINUTES} minutos):\n${resetUrl}\n\nSe não foi você, ignore este e-mail.`,
    }).catch(() => {
      // Never surface mail failures to the caller (enumeration + UX).
    });
  }

  return { message: 'Se o e-mail existir, enviaremos instruções de redefinição.' };
}

/**
 * Completes a password reset with the emailed token. Marks the token used,
 * updates the password hash and revokes all refresh tokens (forces re-login
 * on every device).
 */
export async function resetPassword(rawToken: string, newPassword: string) {
  const stored = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(rawToken) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw { statusCode: 400, message: 'Token inválido ou expirado.' };
  }

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { message: 'Senha redefinida com sucesso.' };
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
