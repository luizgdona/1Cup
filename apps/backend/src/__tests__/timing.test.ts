import { afterEach, describe, expect, it, vi } from 'vitest';

import { withMinimumDuration } from '../shared/utils/timing';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withMinimumDuration', () => {
  it('returns the wrapped result', async () => {
    await expect(withMinimumDuration(10, async () => 'ok')).resolves.toBe('ok');
  });

  it('pads a fast operation up to the floor', async () => {
    const started = Date.now();
    await withMinimumDuration(120, async () => 'fast');
    expect(Date.now() - started).toBeGreaterThanOrEqual(110);
  });

  it('does not add delay when the operation already exceeded the floor', async () => {
    const started = Date.now();
    await withMinimumDuration(20, async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
      return 'slow';
    });
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(220);
  });

  it('is unaffected by a wall-clock jump', async () => {
    // An NTP correction mid-request must not shorten the padding: a forward
    // jump would make the helper think the floor was already met and return
    // early, reopening the timing signal it exists to hide. Elapsed time has
    // to come from a monotonic source, not Date.now().
    const realNow = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => realNow + 60_000);

    const started = process.hrtime.bigint();
    await withMinimumDuration(120, async () => 'jumped');
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeGreaterThanOrEqual(110);
  });

  it('still applies the floor when the operation throws', async () => {
    // Otherwise a failure would be measurably faster than a success, which is
    // exactly the signal the floor exists to hide.
    const started = Date.now();
    await expect(
      withMinimumDuration(120, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(Date.now() - started).toBeGreaterThanOrEqual(110);
  });
});
