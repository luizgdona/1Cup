import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { runDetached } from '../../shared/utils/background';
import { buildPasswordResetEmail, buildVerificationEmail } from '../../shared/utils/mail-templates';
import { sendMailDetached } from '../../shared/utils/mailer';
import { withMinimumDuration } from '../../shared/utils/timing';
import type { RegisterInput, LoginInput } from './auth.schema';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const RESET_TOKEN_EXPIRY_MINUTES = 60;
const EMAIL_VERIFY_EXPIRY_HOURS = 24;
/**
 * Response-time floor for the endpoints that answer the same thing whether or
 * not the account exists: /auth/forgot-password and /auth/resend-verification.
 *
 * Belt-and-braces on top of equalizing the work itself: every branch does a
 * single lookup before responding, and the floor absorbs the residual lookup,
 * scheduling and runtime variance. Both endpoints are rate limited, so the
 * padding costs nothing real.
 */
const NEUTRAL_RESPONSE_MIN_MS = 250;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * A throwaway bcrypt hash, compared against when the account does not exist so
 * that both login branches pay the same cost.
 *
 * Computed once, lazily, with the configured cost factor — a hardcoded hash
 * would bake in a fixed round count and stop matching if BCRYPT_ROUNDS changed.
 * The value never matches any password; only its verification time matters.
 */
let dummyPasswordHash: Promise<string> | undefined;
function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHash) {
    dummyPasswordHash = bcrypt.hash(randomBytes(32).toString('hex'), env.BCRYPT_ROUNDS).catch((err) => {
      // Do not cache a rejection: a single transient failure would otherwise be
      // memoized forever and every later unknown-account login would reject,
      // taking the timing defence offline until a restart.
      dummyPasswordHash = undefined;
      throw err;
    });
  }
  return dummyPasswordHash;
}

/**
 * Precomputes the dummy hash so the first unknown-account login does not pay
 * the extra cost of generating it. Called from the server bootstrap; safe and
 * cheap to call more than once.
 */
export function warmPasswordHashing(): Promise<unknown> {
  return getDummyPasswordHash();
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

  // Fire off the verification email (best-effort — never blocks signup).
  await issueEmailVerification(user.id, user.email).catch(() => {});

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

  // Always run the comparison, even with no account to compare against.
  // Returning early skipped bcrypt entirely, so an unknown address answered in
  // a few milliseconds while a real one paid ~250ms of hashing — a gap wide
  // enough to enumerate the whole user base from an unauthenticated endpoint
  // with nothing but a stopwatch. The dummy hash never matches.
  const passwordHash = user?.passwordHash ?? (await getDummyPasswordHash());
  const valid = await bcrypt.compare(input.password, passwordHash);

  if (!user || !valid) {
    throw { statusCode: 401, message: 'Credenciais inválidas.' };
  }

  // Converge stored hashes onto the configured cost. Without this, raising
  // BCRYPT_ROUNDS reopens the gap this function just closed: unknown accounts
  // would verify at the new cost while existing hashes kept verifying at the
  // old one. Detached so it never adds latency to the login itself.
  if (bcrypt.getRounds(user.passwordHash) !== env.BCRYPT_ROUNDS) {
    const { id } = user;
    const plaintext = input.password;
    runDetached('rehashPassword', async () => {
      const passwordHash = await bcrypt.hash(plaintext, env.BCRYPT_ROUNDS);
      await prisma.user.update({ where: { id }, data: { passwordHash } });
    });
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

  // Claim the rotation atomically. The revokedAt check above is a read, and a
  // bare update by id trusted it: two concurrent refreshes presenting the same
  // token both passed the check and both rotated, producing two live token
  // families and defeating the reuse detection entirely.
  //
  // Losing this race means someone else rotated the same token in between,
  // which is exactly the reuse signal — treat it as such. The cost is that a
  // client firing two refreshes at once logs itself out; that is the intended
  // trade for rotation, and the mobile client refreshes through a single
  // queued interceptor.
  // The claim and the replacement insert share one transaction, under the same
  // user lock the family revocation takes. Splitting them left a window where a
  // loser could revoke the family *between* the winner's claim and its insert,
  // so the winner walked away with a live token while reuse was "detected" —
  // the opposite of what the control is for. The lock also orders the loser's
  // revocation strictly after the winner commits, so it sees the new row.
  const issued = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${stored.userId} FOR UPDATE`;

    const claimed = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) return null;

    return issueTokenPair(stored.user.id, stored.user.role, app, tx);
  });

  if (!issued) {
    // Losing the claim means someone else rotated this very token in between,
    // which is the reuse signal.
    await revokeAllUserTokens(stored.userId);
    throw { statusCode: 401, message: 'Sessão invalidada por segurança. Faça login novamente.' };
  }

  return { user: stored.user, ...issued };
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { token: tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserTokens(userId: string) {
  await prisma.$transaction(async (tx) => {
    // Same user lock as rotation, so a revocation triggered by reuse cannot run
    // between a concurrent rotation's claim and its insert and miss the row it
    // is supposed to kill.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}

// ── Password reset ────────────────────────────────────────────

/**
 * Starts a password reset. Always resolves the same way regardless of whether
 * the email exists (prevents account enumeration). Sends a single-use, hashed,
 * short-lived token by email.
 */
export async function requestPasswordReset(email: string) {
  // Three layers guard against enumeration here, because the neutral message
  // alone only hides the *content* of the answer, not its timing: the
  // secret-dependent work runs detached (below), the send does not block the
  // response, and the floor absorbs what variance is left.
  return withMinimumDuration(NEUTRAL_RESPONSE_MIN_MS, async () => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    // Everything that only happens for a registered address runs off the
    // response path. Both branches therefore perform exactly one lookup before
    // responding — the work itself no longer differs, so the floor no longer
    // has to be larger than whatever the writes happen to cost under load.
    if (user) {
      runDetached('passwordReset', () => issuePasswordResetToken(user.id, email));
    }

    return { message: 'Se o e-mail existir, enviaremos instruções de redefinição.' };
  });
}

/**
 * Writes a fresh single-use reset token and emails the link.
 *
 * Deliberately called detached from requestPasswordReset: these writes only
 * happen for addresses that exist, so doing them inline would make a
 * registered address slower to answer and reintroduce the enumeration oracle.
 */
async function issuePasswordResetToken(userId: string, email: string) {
  const rawToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60_000);

  await prisma.$transaction(async (tx) => {
    // Serializes concurrent issuance for this user. "Invalidate the old, then
    // create the new" is a read-modify-write: run twice in parallel, both
    // invalidations can complete before either create, leaving two usable
    // links — so a reset requested *because* an earlier link leaked would not
    // actually kill that link. A transaction alone does not help under READ
    // COMMITTED; the row lock is what forces the pair to run one at a time.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

    await tx.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await tx.passwordResetToken.create({
      data: { token: hashToken(rawToken), userId, expiresAt },
    });
  });

  const resetUrl = `${env.CORS_ORIGIN.split(',')[0].trim()}/reset-password?token=${rawToken}`;
  const { subject, text, html } = buildPasswordResetEmail(resetUrl, RESET_TOKEN_EXPIRY_MINUTES);
  sendMailDetached({ to: email, subject, text, html });
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

  await prisma.$transaction(async (tx) => {
    // Same lock order as issuance: user row first, then its token rows.
    // Redemption used to take them in the opposite order, so a redemption
    // racing a reissue could deadlock and Postgres would abort one of them —
    // surfacing as a 500 here, or as a silently lost background issuance.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${stored.userId} FOR UPDATE`;

    const consumed = await tx.passwordResetToken.updateMany({
      where: {
        id: stored.id,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw { statusCode: 400, message: 'Token inválido ou expirado.' };
    }
    await tx.user.update({ where: { id: stored.userId }, data: { passwordHash } });
    await tx.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  return { message: 'Senha redefinida com sucesso.' };
}

// ── Email verification ────────────────────────────────────────

/**
 * Creates a single-use email-verification token and emails the link.
 * Called on registration and on explicit resend. Best-effort: a mail failure
 * never blocks the surrounding flow.
 */
export async function issueEmailVerification(userId: string, email: string) {
  const rawToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_EXPIRY_HOURS * 3_600_000);

  // Same read-modify-write race as the password-reset issuance above: two
  // overlapping resends would otherwise leave two usable verification links.
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

    await tx.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await tx.emailVerificationToken.create({
      data: { token: hashToken(rawToken), userId, expiresAt },
    });
  });

  const verifyUrl = `${env.CORS_ORIGIN.split(',')[0].trim()}/verify-email?token=${rawToken}`;
  const { subject, text, html } = buildVerificationEmail(verifyUrl, EMAIL_VERIFY_EXPIRY_HOURS);
  // Best-effort and detached — a mail failure or a slow SMTP server never
  // blocks registration/resend.
  sendMailDetached({ to: email, subject, text, html });
}

/** Marks the user's email verified given a valid, unused, unexpired token. */
export async function verifyEmail(rawToken: string) {
  const stored = await prisma.emailVerificationToken.findUnique({
    where: { token: hashToken(rawToken) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw { statusCode: 400, message: 'Token inválido ou expirado.' };
  }

  await prisma.$transaction(async (tx) => {
    // User row first, matching issuance — see resetPassword for why.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${stored.userId} FOR UPDATE`;

    const consumed = await tx.emailVerificationToken.updateMany({
      where: {
        id: stored.id,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw { statusCode: 400, message: 'Token inválido ou expirado.' };
    }
    await tx.user.update({ where: { id: stored.userId }, data: { isVerified: true } });
  });

  return { message: 'E-mail verificado com sucesso.' };
}

/** Re-sends verification. Enumeration-safe and idempotent for verified users. */
export async function resendVerification(email: string) {
  // Same three-layer treatment as requestPasswordReset: the neutral message
  // hides the content of the answer, but only the unverified branch has work
  // to do, so awaiting it would leak that state through response time.
  return withMinimumDuration(NEUTRAL_RESPONSE_MIN_MS, async () => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isVerified: true },
    });

    if (user && !user.isVerified) {
      runDetached('emailVerification', () => issueEmailVerification(user.id, email));
    }

    return { message: 'Se o e-mail existir e não estiver verificado, enviaremos um novo link.' };
  });
}

// ── helpers ───────────────────────────────────────────────────

/** The slice of the client `issueTokenPair` needs — satisfied by both `prisma` and a transaction. */
type RefreshTokenWriter = Pick<typeof prisma, 'refreshToken'>;

async function issueTokenPair(
  userId: string,
  role: string,
  app: FastifyInstance,
  client: RefreshTokenWriter = prisma
) {
  const accessToken = app.jwt.sign(
    { sub: userId, role },
    { expiresIn: '15m' }
  );

  const rawRefresh = randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawRefresh);

  await client.refreshToken.create({
    data: {
      token: tokenHash,
      userId,
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  return { accessToken, refreshToken: rawRefresh };
}
