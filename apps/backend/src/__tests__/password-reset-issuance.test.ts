import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Prisma and the mailer are mocked: this asserts *how* token issuance is
// sequenced, not that it talks to a real database.
const { prismaMock, calls } = vi.hoisted(() => {
  const calls: string[] = [];

  const tx = {
    $queryRaw: vi.fn(async () => {
      calls.push('lock');
      return [];
    }),
    passwordResetToken: {
      updateMany: vi.fn(async () => {
        calls.push('invalidate');
        return { count: 0 };
      }),
      create: vi.fn(async () => {
        calls.push('create');
        return {};
      }),
    },
  };

  return {
    calls,
    prismaMock: {
      user: { findUnique: vi.fn(async () => ({ id: 'user-1' })) },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => {
        calls.push('tx:begin');
        const result = await fn(tx);
        calls.push('tx:commit');
        return result;
      }),
      _tx: tx,
    },
  };
});

vi.mock('../config/database', () => ({ prisma: prismaMock }));
vi.mock('../shared/utils/mailer', () => ({
  sendMailDetached: vi.fn(),
  sendMail: vi.fn(),
}));

import { requestPasswordReset } from '../modules/auth/auth.service';
import { drainBackgroundTasks } from '../shared/utils/background';

describe('password reset token issuance', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  afterEach(async () => {
    await drainBackgroundTasks(1000);
    vi.clearAllMocks();
  });

  it('invalidates and creates inside a single transaction', async () => {
    await requestPasswordReset('barista@cafe.com');
    await drainBackgroundTasks(2000);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    // Both writes must be inside the same transaction, otherwise a crash
    // between them leaves the user with no usable link at all.
    expect(calls).toEqual(['tx:begin', 'lock', 'invalidate', 'create', 'tx:commit']);
  });

  it('takes a row lock before reading the existing tokens', async () => {
    // Without the lock, two overlapping issuances can both invalidate before
    // either creates, leaving two usable reset links for the same account.
    await requestPasswordReset('barista@cafe.com');
    await drainBackgroundTasks(2000);

    expect(prismaMock._tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(calls.indexOf('lock')).toBeLessThan(calls.indexOf('invalidate'));
  });

  it('does no write work at all for an unknown address', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null as never);

    await requestPasswordReset('desconhecido@cafe.com');
    await drainBackgroundTasks(2000);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(sendMailDetached).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });
});
