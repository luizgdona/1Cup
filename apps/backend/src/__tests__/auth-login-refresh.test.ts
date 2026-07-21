import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, bcryptMock, calls } = vi.hoisted(() => {
  const calls: string[] = [];

  const bcryptMock = {
    hash: vi.fn(async () => '$2a$12$dummyhashdummyhashdummyhashdummyhashdummyhashdu'),
    compare: vi.fn(async () => false),
    getRounds: vi.fn(() => 4), // matches BCRYPT_ROUNDS in setup.ts
  };

  const tx = {
    $queryRaw: vi.fn(async () => {
      calls.push('lock:user');
      return [];
    }),
    refreshToken: {
      // Both the rotation claim and the family revocation run through the
      // transaction client now, so tell them apart by what they target.
      updateMany: vi.fn(async (args: { where?: { id?: string; userId?: string } }) => {
        calls.push(args?.where?.id ? 'tx:claim' : 'revokeFamily');
        return { count: 1 };
      }),
      create: vi.fn(async () => {
        calls.push('tx:createReplacement');
        return {};
      }),
    },
  };

  return {
    bcryptMock,
    calls,
    prismaMock: {
      _tx: tx,
      user: {
        findUnique: vi.fn(async () => null as unknown),
        update: vi.fn(async () => ({})),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      refreshToken: {
        findUnique: vi.fn(async () => null as unknown),
        update: vi.fn(async () => ({})),
        updateMany: vi.fn(async () => {
          calls.push('revokeFamily');
          return { count: 2 };
        }),
        create: vi.fn(async () => ({})),
      },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  };
});

vi.mock('../config/database', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({ default: bcryptMock }));
vi.mock('../shared/utils/mailer', () => ({ sendMailDetached: vi.fn(), sendMail: vi.fn() }));

import { login, refresh, resetPasswordHashingWarmup, warmPasswordHashing } from '../modules/auth/auth.service';
import { drainBackgroundTasks } from '../shared/utils/background';

const app = { jwt: { sign: vi.fn(() => 'signed-token') } } as never;

const validToken = {
  id: 'rt-1',
  userId: 'user-1',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 86_400_000),
  user: { id: 'user-1', username: 'barista', email: 'b@c.com', displayName: 'B', avatarUrl: null, role: 'USER' },
};

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bcryptMock.compare.mockResolvedValue(false as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hashes a password even when the account does not exist', async () => {
    // Otherwise an unknown address returns in a few ms while a real one pays
    // ~250ms of bcrypt — a ~100x gap on an unauthenticated endpoint that lets
    // anyone enumerate the whole user base with a stopwatch.
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(login({ email: 'ninguem@cafe.com', password: 'Senha123' }, app)).rejects.toMatchObject({
      statusCode: 401,
    });

    expect(bcryptMock.compare).toHaveBeenCalledTimes(1);
  });

  it('returns the identical error for an unknown account and a wrong password', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await login({ email: 'ninguem@cafe.com', password: 'Senha123' }, app).catch((e) => e);

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      passwordHash: 'hash-real',
      role: 'USER',
    } as never);
    bcryptMock.compare.mockResolvedValueOnce(false as never);
    const wrongPassword = await login({ email: 'existe@cafe.com', password: 'Errada123' }, app).catch((e) => e);

    expect(unknown).toEqual(wrongPassword);
  });
});

describe('refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    // Restore the recording implementation: a plain mockResolvedValue would
    // replace it and silently stop the call log from being written.
    prismaMock._tx.refreshToken.updateMany.mockImplementation(
      async (args: { where?: { id?: string } }) => {
        calls.push(args?.where?.id ? 'tx:claim' : 'revokeFamily');
        return { count: 1 };
      }
    );
  });

  it('claims the rotation atomically, guarded on the token still being live', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce(validToken as never);

    await refresh('raw-token', app);

    // A bare `update` by id would let two concurrent refreshes with the same
    // token both pass the revokedAt check and both rotate.
    expect(prismaMock._tx.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'rt-1', revokedAt: null }),
      })
    );
    expect(prismaMock.refreshToken.update).not.toHaveBeenCalled();
  });

  it('issues the replacement inside the same locked transaction as the claim', async () => {
    // Otherwise a loser revoking the family between the winner's claim and its
    // insert leaves the winner holding a live token — reuse "detected" while a
    // usable session survives, which is the opposite of the intent.
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce(validToken as never);

    await refresh('raw-token', app);

    expect(calls).toEqual(['lock:user', 'tx:claim', 'tx:createReplacement']);
  });

  it('treats a lost rotation race as token reuse and revokes the family', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce(validToken as never);
    // Someone else rotated it between our read and our write.
    prismaMock._tx.refreshToken.updateMany.mockImplementationOnce(async () => {
      calls.push('tx:claim');
      return { count: 0 };
    });

    await expect(refresh('raw-token', app)).rejects.toMatchObject({ statusCode: 401 });

    // No replacement may be created on the losing path.
    expect(prismaMock._tx.refreshToken.create).not.toHaveBeenCalled();
    expect(calls).toContain('revokeFamily');
  });

  it('still revokes the family when a already-revoked token is replayed', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce({
      ...validToken,
      revokedAt: new Date(),
    } as never);

    await expect(refresh('raw-token', app)).rejects.toMatchObject({ statusCode: 401 });
    expect(calls).toContain('revokeFamily');
  });

  it('takes the user lock when revoking a family, matching the rotation path', async () => {
    // The loser must serialize behind the winner's transaction, otherwise its
    // revocation can run before the replacement row exists and miss it.
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce({
      ...validToken,
      revokedAt: new Date(),
    } as never);

    await expect(refresh('raw-token', app)).rejects.toMatchObject({ statusCode: 401 });

    expect(calls.indexOf('lock:user')).toBeLessThan(calls.indexOf('revokeFamily'));
  });
});

describe('password cost migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    bcryptMock.compare.mockResolvedValue(true as never);
    bcryptMock.getRounds.mockReturnValue(4);
  });

  afterEach(async () => {
    await drainBackgroundTasks(1000);
  });

  it('rehashes a password stored at a different cost than configured', async () => {
    // Otherwise raising BCRYPT_ROUNDS reopens the oracle: unknown accounts pay
    // the new cost while existing hashes keep verifying at the old one.
    bcryptMock.getRounds.mockReturnValueOnce(10);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      passwordHash: 'old-cost-hash',
      role: 'USER',
    } as never);

    await login({ email: 'existe@cafe.com', password: 'Senha123' }, app);
    await drainBackgroundTasks(1000);

    // Compare-and-set: guarded on the hash we actually verified, so a password
    // change landing between login and this rehash is not clobbered.
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1', passwordHash: 'old-cost-hash' },
      })
    );
  });

  it('does not revert a password changed underneath the rehash', async () => {
    bcryptMock.getRounds.mockReturnValueOnce(10);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      passwordHash: 'old-cost-hash',
      role: 'USER',
    } as never);
    // The guarded update matches nothing: the password already moved on.
    prismaMock.user.updateMany.mockResolvedValueOnce({ count: 0 } as never);

    await expect(
      login({ email: 'existe@cafe.com', password: 'Senha123' }, app)
    ).resolves.toMatchObject({ user: { id: 'user-1' } });
    await drainBackgroundTasks(1000);

    // A count of 0 is the expected, safe outcome — not an error, not a retry.
    expect(prismaMock.user.updateMany).toHaveBeenCalledTimes(1);
  });

  it('leaves a password already at the configured cost alone', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      passwordHash: 'current-cost-hash',
      role: 'USER',
    } as never);

    await login({ email: 'existe@cafe.com', password: 'Senha123' }, app);
    await drainBackgroundTasks(1000);

    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });
});

describe('login response-time floor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPasswordHashingWarmup();
  });

  it('pads login to the boot-measured floor so a stale-cost hash is not faster', async () => {
    // After a cost bump, a not-yet-migrated account verifies at the old, faster
    // cost while unknown accounts use the new-cost dummy — a residual timing
    // gap. The floor, measured from the boot hash, pads every login up so the
    // fast path cannot be told apart.
    bcryptMock.hash.mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 80));
      return 'dummy';
    });
    await warmPasswordHashing();

    // A wrong-password login whose bcrypt is effectively instant (mocked).
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      passwordHash: 'h',
      role: 'USER',
    } as never);
    bcryptMock.compare.mockResolvedValueOnce(false as never);

    const started = Date.now();
    await login({ email: 'x@y.com', password: 'nope' }, app).catch(() => {});
    expect(Date.now() - started).toBeGreaterThanOrEqual(60);
  });
});
