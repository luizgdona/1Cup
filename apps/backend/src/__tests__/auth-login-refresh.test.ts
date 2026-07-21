import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, bcryptMock } = vi.hoisted(() => {
  const bcryptMock = {
    hash: vi.fn(async () => '$2a$12$dummyhashdummyhashdummyhashdummyhashdummyhashdu'),
    compare: vi.fn(async () => false),
  };

  return {
    bcryptMock,
    prismaMock: {
      user: { findUnique: vi.fn(async () => null as unknown) },
      refreshToken: {
        findUnique: vi.fn(async () => null as unknown),
        update: vi.fn(async () => ({})),
        updateMany: vi.fn(async () => ({ count: 1 })),
        create: vi.fn(async () => ({})),
      },
    },
  };
});

vi.mock('../config/database', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({ default: bcryptMock }));
vi.mock('../shared/utils/mailer', () => ({ sendMailDetached: vi.fn(), sendMail: vi.fn() }));

import { login, refresh } from '../modules/auth/auth.service';

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
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 } as never);
  });

  it('claims the rotation atomically, guarded on the token still being live', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce(validToken as never);

    await refresh('raw-token', app);

    // A bare `update` by id would let two concurrent refreshes with the same
    // token both pass the revokedAt check and both rotate.
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'rt-1', revokedAt: null }),
      })
    );
    expect(prismaMock.refreshToken.update).not.toHaveBeenCalled();
  });

  it('treats a lost rotation race as token reuse and revokes the family', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce(validToken as never);
    // Someone else rotated it between our read and our write.
    prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 } as never);

    await expect(refresh('raw-token', app)).rejects.toMatchObject({ statusCode: 401 });

    // The family revocation is itself an updateMany over the user's tokens.
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', revokedAt: null }),
      })
    );
  });

  it('still revokes the family when a already-revoked token is replayed', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce({
      ...validToken,
      revokedAt: new Date(),
    } as never);

    await expect(refresh('raw-token', app)).rejects.toMatchObject({ statusCode: 401 });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', revokedAt: null }),
      })
    );
  });
});
