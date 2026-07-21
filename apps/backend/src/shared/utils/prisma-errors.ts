/**
 * Narrow helpers for the Prisma error codes worth reacting to.
 *
 * Kept structural rather than importing `Prisma.PrismaClientKnownRequestError`,
 * so mocked clients in tests are recognised the same way the real one is.
 */

/**
 * A unique-constraint violation (P2002).
 *
 * Every `if (!existing) create(...)` in this codebase is a check-then-act: the
 * schema's unique constraints keep a lost race from corrupting anything, but
 * without handling the violation the loser gets a 500 on an operation that is
 * supposed to be idempotent or to report a plain conflict.
 */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}
