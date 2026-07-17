import { z } from 'zod';

/**
 * Reusable, hardened pagination fields for list endpoints.
 *
 * Security rationale:
 * - Query params arrive as strings. A naïve `z.string().transform(Number)`
 *   turns `?page=abc` into `NaN`, which Prisma silently forwards to `skip`/`take`
 *   and can break the query or return unexpected rows.
 * - Without an upper bound, `?perPage=1000000` lets a single request pull the
 *   entire table (data exfiltration) and exhaust DB/memory (denial of service).
 *
 * `page` is clamped to [1, ∞) and `perPage` to [1, MAX_PER_PAGE].
 */
export const MAX_PER_PAGE = 100;

const pageField = z.coerce
  .number()
  .int()
  .min(1)
  .catch(1)
  .default(1);

const perPageField = z.coerce
  .number()
  .int()
  .min(1)
  .max(MAX_PER_PAGE)
  .catch(20)
  .default(20);

export const paginationSchema = z.object({
  page: pageField,
  perPage: perPageField,
});

export { pageField, perPageField };
