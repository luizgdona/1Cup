/**
 * Timing helpers used to flatten observable differences between code paths.
 */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `work` and resolves no earlier than `minMs` from the call.
 *
 * Used to smooth residual latency variance on neutral auth endpoints after
 * secret-dependent work has been detached from the response path. This helper
 * only enforces a minimum; it cannot hide work whose duration exceeds `minMs`.
 *
 * The floor also applies when `work` throws, otherwise a failure would be
 * measurably faster than a success and reintroduce the same leak.
 */
export async function withMinimumDuration<T>(minMs: number, work: () => Promise<T>): Promise<T> {
  // performance.now(), not Date.now(): elapsed time must come from a monotonic
  // source. A wall-clock correction (NTP) during the request could otherwise
  // make the helper believe the floor was already met and return early,
  // reopening the very signal it exists to hide.
  const startedAt = performance.now();

  try {
    return await work();
  } finally {
    const remaining = minMs - (performance.now() - startedAt);
    if (remaining > 0) await delay(Math.ceil(remaining));
  }
}
