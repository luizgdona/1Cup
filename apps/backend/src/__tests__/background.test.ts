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

});

describe('nested detached work', () => {
  it('drains a task registered by another task', async () => {
    // The real shape: password-reset issuance writes the token and only then
    // hands the email to sendMailDetached. A drain that snapshots the registry
    // once finishes with the issuance while the send has just been added, and
    // shutdown proceeds to kill the process mid-send.
    let innerFinished = false;

    runDetached('outer', async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      runDetached('inner', async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        innerFinished = true;
      });
    });

    await drainBackgroundTasks(3000);

    expect(innerFinished).toBe(true);
    expect(pendingBackgroundTasks()).toBe(0);
  });

});

// These leave work in the registry on purpose, and a task that never settles
// can never be removed — which is exactly why the drain is bounded. Kept last
// so the residue cannot leak into another test.
describe('drain deadline (leaves residue — keep last)', () => {
  it('gives up at the deadline instead of hanging shutdown', async () => {
    runDetached('travado', () => new Promise<void>(() => {}));

    const started = Date.now();
    await expect(drainBackgroundTasks(120)).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(600);
  });

  it('still honours the deadline when tasks keep spawning tasks', async () => {
    // A chain that outlives the deadline must not hold the deploy open. Bounded
    // rather than infinite so it cannot keep spawning for the rest of the run.
    const spawn = (remaining: number) => {
      if (remaining === 0) return;
      runDetached('loop', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        spawn(remaining - 1);
      });
    };
    spawn(50);

    const started = Date.now();
    await drainBackgroundTasks(150);
    expect(Date.now() - started).toBeLessThan(900);
  });
});
