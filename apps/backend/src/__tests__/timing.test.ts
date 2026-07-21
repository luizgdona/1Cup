import { describe, expect, it } from 'vitest';

import { withMinimumDuration } from '../shared/utils/timing';

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
