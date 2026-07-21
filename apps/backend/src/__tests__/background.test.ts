import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  drainBackgroundTasks,
  pendingBackgroundTasks,
  runDetached,
} from '../shared/utils/background';

afterEach(async () => {
  // Never leave work in flight for the next test.
  await drainBackgroundTasks(500);
  vi.restoreAllMocks();
});

describe('runDetached', () => {
  it('returns immediately and tracks the task while it is in flight', () => {
    let release: (() => void) | undefined;
    const started = Date.now();

    runDetached('teste', () => new Promise<void>((resolve) => {
      release = resolve;
    }));

    expect(Date.now() - started).toBeLessThan(50);
    expect(pendingBackgroundTasks()).toBe(1);
    release?.();
  });

  it('clears the task once it settles', async () => {
    runDetached('teste', async () => {});
    await drainBackgroundTasks(1000);
    expect(pendingBackgroundTasks()).toBe(0);
  });

  it('swallows failures instead of producing an unhandled rejection', async () => {
    expect(() =>
      runDetached('teste', async () => {
        throw new Error('boom');
      })
    ).not.toThrow();

    await drainBackgroundTasks(1000);
    expect(pendingBackgroundTasks()).toBe(0);
  });
});

describe('drainBackgroundTasks', () => {
  it('waits for in-flight work to finish', async () => {
    // The point of the registry: SIGTERM must not kill the process while a
    // reset token is being written or a verification email is in flight.
    let done = false;
    runDetached('teste', async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      done = true;
    });

    await drainBackgroundTasks(2000);
    expect(done).toBe(true);
  });

  it('resolves immediately when nothing is pending', async () => {
    const started = Date.now();
    await drainBackgroundTasks(5000);
    expect(Date.now() - started).toBeLessThan(50);
  });

  // Last on purpose: a task that never settles cannot be removed from the
  // registry — that is precisely why the drain is bounded — so this would
  // otherwise leak a pending task into whichever test ran next.
  it('gives up at the deadline instead of hanging shutdown', async () => {
    runDetached('travado', () => new Promise<void>(() => {}));

    const started = Date.now();
    await expect(drainBackgroundTasks(120)).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(600);
  });
});
