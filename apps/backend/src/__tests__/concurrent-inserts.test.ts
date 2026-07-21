import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `if (!existing) create(...)` is a check-then-act. The unique constraints in
 * the schema stop it from corrupting anything, but an unhandled P2002 turns a
 * lost race into a 500 for the user — on endpoints that are documented as
 * idempotent, no less.
 */
const { prismaMock, uniqueViolation } = vi.hoisted(() => {
  const uniqueViolation = Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    clientVersion: '6.0.0',
  });

  return {
    uniqueViolation,
    prismaMock: {
      checkIn: {
        findUnique: vi.fn(async () => ({ id: 'chk-1', userId: 'owner-1', isPublic: true })),
      },
      checkInLike: {
        findUnique: vi.fn(async () => null as unknown),
        create: vi.fn(async () => ({})),
        count: vi.fn(async () => 3),
      },
      user: { findUnique: vi.fn(async () => ({ id: 'target-1' })) },
      friendship: {
        findUnique: vi.fn(async () => null as unknown),
        create: vi.fn(async () => ({ id: 'fr-1' })),
      },
    },
  };
});

vi.mock('../config/database', () => ({ prisma: prismaMock }));
vi.mock('../shared/utils/blocks', () => ({ isBlockedBetween: vi.fn(async () => false) }));
vi.mock('../modules/notifications/notifications.service', () => ({
  createNotification: vi.fn(async () => ({})),
}));
vi.mock('../modules/badges/badges.service', () => ({ evaluateBadges: vi.fn(async () => []) }));

import { evaluateBadges } from '../modules/badges/badges.service';
import { likeCheckin } from '../modules/checkins/likes.service';
import { sendRequest } from '../modules/friends/friends.service';
import { drainBackgroundTasks, pendingBackgroundTasks } from '../shared/utils/background';

describe('likeCheckin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.checkInLike.findUnique.mockResolvedValue(null);
    prismaMock.checkInLike.create.mockResolvedValue({} as never);
    prismaMock.checkInLike.count.mockResolvedValue(3 as never);
  });

  afterEach(async () => {
    await drainBackgroundTasks(1000);
  });

  it('stays idempotent when a concurrent like wins the race', async () => {
    // Two likes in flight: both see no existing row, both insert, one gets
    // P2002. The endpoint promises "a repeated like is a no-op, not an error".
    prismaMock.checkInLike.create.mockRejectedValueOnce(uniqueViolation as never);

    await expect(likeCheckin('chk-1', 'user-1')).resolves.toMatchObject({ liked: true });
  });

  it('still surfaces unexpected database errors', async () => {
    prismaMock.checkInLike.create.mockRejectedValueOnce(new Error('connection lost') as never);

    await expect(likeCheckin('chk-1', 'user-1')).rejects.toThrow('connection lost');
  });

  it('registers badge evaluation as drainable background work', async () => {
    // Untracked, it is dropped on every deploy that lands mid-evaluation.
    let release: (() => void) | undefined;
    vi.mocked(evaluateBadges).mockReturnValueOnce(
      new Promise((resolve) => {
        release = () => resolve([]);
      }) as never
    );

    await likeCheckin('chk-1', 'user-1');

    expect(pendingBackgroundTasks()).toBeGreaterThan(0);
    release?.();
    await drainBackgroundTasks(1000);
    expect(pendingBackgroundTasks()).toBe(0);
  });
});

describe('sendRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.friendship.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'target-1' } as never);
  });

  afterEach(async () => {
    await drainBackgroundTasks(1000);
  });

  it('reports a concurrent duplicate as a conflict, not an internal error', async () => {
    prismaMock.friendship.create.mockRejectedValueOnce(uniqueViolation as never);

    await expect(sendRequest('user-1', 'target-1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('still surfaces unexpected database errors', async () => {
    prismaMock.friendship.create.mockRejectedValueOnce(new Error('connection lost') as never);

    await expect(sendRequest('user-1', 'target-1')).rejects.toThrow('connection lost');
  });
});
