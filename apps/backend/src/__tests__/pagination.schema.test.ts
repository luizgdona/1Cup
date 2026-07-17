import { describe, it, expect } from 'vitest';
import { paginationSchema, MAX_PER_PAGE } from '../shared/utils/pagination.schema';

describe('paginationSchema (hardened)', () => {
  it('defaults to page 1 / perPage 20 when absent', () => {
    const r = paginationSchema.parse({});
    expect(r).toEqual({ page: 1, perPage: 20 });
  });

  it('coerces valid numeric strings', () => {
    const r = paginationSchema.parse({ page: '3', perPage: '50' });
    expect(r).toEqual({ page: 3, perPage: 50 });
  });

  it('falls back to defaults on non-numeric input (no NaN reaches Prisma)', () => {
    const r = paginationSchema.parse({ page: 'abc', perPage: 'xyz' });
    expect(r.page).toBe(1);
    expect(r.perPage).toBe(20);
    expect(Number.isNaN(r.page)).toBe(false);
    expect(Number.isNaN(r.perPage)).toBe(false);
  });

  it('rejects an oversized perPage (DoS / bulk-exfiltration guard)', () => {
    const r = paginationSchema.parse({ perPage: '1000000' });
    expect(r.perPage).toBeLessThanOrEqual(MAX_PER_PAGE);
  });

  it('rejects zero / negative pages', () => {
    expect(paginationSchema.parse({ page: '0' }).page).toBe(1);
    expect(paginationSchema.parse({ page: '-5' }).page).toBe(1);
    expect(paginationSchema.parse({ perPage: '0' }).perPage).toBe(20);
  });

  it('ignores injection-style values', () => {
    const r = paginationSchema.parse({ page: "1; DROP TABLE users", perPage: '20 OR 1=1' });
    expect(r.page).toBe(1);
    expect(r.perPage).toBe(20);
  });
});
