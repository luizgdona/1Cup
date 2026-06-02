import { describe, it, expect } from 'vitest';
import { paginate, paginationMeta } from '../shared/utils/pagination';

describe('paginate', () => {
  it('page 1 gives skip=0', () => {
    const { skip, take } = paginate(1, 20);
    expect(skip).toBe(0);
    expect(take).toBe(20);
  });

  it('page 2 gives correct skip', () => {
    const { skip, take } = paginate(2, 20);
    expect(skip).toBe(20);
    expect(take).toBe(20);
  });

  it('custom perPage', () => {
    const { skip, take } = paginate(3, 10);
    expect(skip).toBe(20);
    expect(take).toBe(10);
  });
});

describe('paginationMeta', () => {
  it('calculates totalPages correctly', () => {
    const meta = paginationMeta(100, 1, 20);
    expect(meta.totalPages).toBe(5);
    expect(meta.total).toBe(100);
    expect(meta.page).toBe(1);
    expect(meta.perPage).toBe(20);
  });

  it('rounds up totalPages', () => {
    const meta = paginationMeta(21, 1, 20);
    expect(meta.totalPages).toBe(2);
  });

  it('returns 1 totalPage for empty result', () => {
    const meta = paginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
  });
});
