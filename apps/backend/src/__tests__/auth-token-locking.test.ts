import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Issuance and redemption both touch the user row and its token rows. If they
 * take those locks in opposite orders, two concurrent requests deadlock and
 * Postgres aborts one of them — a 500 on redemption, or a silently lost
 * background issuance. These tests pin the order: user first, always.
 */
const { prismaMock, calls, hang } = vi.hoisted(() => {
  const calls: string[] = [];
  const hang = { transaction: false };

  const record = (name: string) => async () => {
    calls.push(name);
    return { count: 0 } as never;
  };

  const tx = {
    $queryRaw: vi.fn(async () => {
      calls.push('lock:user');
      return [];
    }),
    user: { update: vi.fn(record('write:user')) },
    passwordResetToken: {
      update: vi.fn(record('write:resetToken')),
      updateMany: vi.fn(record('write:resetToken')),
      create: vi.fn(record('write:resetToken')),
    },
    emailVerificationToken: {
      update: vi.fn(record('write:verifyToken')),
      updateMany: vi.fn(record('write:verifyToken')),
      create: vi.fn(record('write:verifyToken')),
    },
    refreshToken: { updateMany: vi.fn(record('write:refreshToken')) },
  };

  return {
    calls,
    hang,
    prismaMock: {
      _tx: tx,
      user: {
        findUnique: vi.fn(async () => ({ id: 'user-1', isVerified: false })),
      },
      passwordResetToken: {
        findUnique: vi.fn(async () => ({
          id: 'tok-1',
          userId: 'user-1',
          usedAt: null,
          expiresAt: new Date(Date.now() + 3_600_000),
        })),
      },
      emailVerificationToken: {
        findUnique: vi.fn(async () => ({
          id: 'tok-2',
          userId: 'user-1',
          usedAt: null,
          expiresAt: new Date(Date.now() + 3_600_000),
        })),
      },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => {
        if (hang.transaction) await new Promise(() => {});
        return fn(tx);
      }),
    },
  };
});

vi.mock('../config/database', () => ({ prisma: prismaMock }));
vi.mock('../shared/utils/mailer', () => ({ sendMailDetached: vi.fn(), sendMail: vi.fn() }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(async () => 'hash'), compare: vi.fn() } }));

import { resendVerification, resetPassword, verifyEmail } from '../modules/auth/auth.service';
import { drainBackgroundTasks } from '../shared/utils/background';

describe('lock ordering', () => {
  beforeEach(() => {
    calls.length = 0;
    hang.transaction = false;
  });

  afterEach(async () => {
    await drainBackgroundTasks(1000);
    vi.clearAllMocks();
  });

  it('resetPassword locks the user before touching token rows', async () => {
    await resetPassword('raw-token', 'NovaSenha123');

    expect(calls[0]).toBe('lock:user');
    expect(calls).toContain('write:resetToken');
  });

  it('verifyEmail locks the user before touching token rows', async () => {
    await verifyEmail('raw-token');

    expect(calls[0]).toBe('lock:user');
    expect(calls).toContain('write:verifyToken');
  });
});

describe('resendVerification', () => {
  beforeEach(() => {
    calls.length = 0;
    hang.transaction = false;
  });

  afterEach(async () => {
    hang.transaction = false;
    await drainBackgroundTasks(1000);
    vi.clearAllMocks();
  });

  it('does not wait on issuance, so an unverified account is not timing-distinguishable', async () => {
    // Only the unverified branch has work to do. Awaiting it makes that branch
    // measurably slower and turns the neutral message into an oracle.
    hang.transaction = true;

    const started = Date.now();
    await expect(resendVerification('barista@cafe.com')).resolves.toMatchObject({
      message: expect.stringContaining('Se o e-mail existir'),
    });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('answers no faster for an unknown address than for a real one', async () => {
    const unknownStart = Date.now();
    await resendVerification('desconhecido@cafe.com');
    const unknownElapsed = Date.now() - unknownStart;

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      isVerified: false,
    } as never);
    const knownStart = Date.now();
    await resendVerification('barista@cafe.com');
    const knownElapsed = Date.now() - knownStart;

    // Both branches sit on the same floor, so neither is a usable signal.
    expect(unknownElapsed).toBeGreaterThanOrEqual(200);
    expect(Math.abs(knownElapsed - unknownElapsed)).toBeLessThan(150);
  });

  it('skips issuance entirely for an already verified account', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      isVerified: true,
    } as never);

    await resendVerification('verificado@cafe.com');
    await drainBackgroundTasks(1000);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
