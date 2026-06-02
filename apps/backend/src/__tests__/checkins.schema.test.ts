import { describe, it, expect } from 'vitest';
import { createCheckinSchema, updateCheckinSchema } from '../modules/checkins/checkins.schema';

describe('createCheckinSchema', () => {
  const validBase = { coffeeId: 'clxxxxxxxxxxxxxxx0000000001', rating: 40 };

  it('accepts valid check-in (full stars)', () => {
    const r = createCheckinSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it('accepts half-star rating (5 = 0.5 stars)', () => {
    const r = createCheckinSchema.safeParse({ ...validBase, rating: 5 });
    expect(r.success).toBe(true);
  });

  it('accepts rating 0 (no rating)', () => {
    const r = createCheckinSchema.safeParse({ ...validBase, rating: 0 });
    expect(r.success).toBe(true);
  });

  it('rejects rating above 50', () => {
    const r = createCheckinSchema.safeParse({ ...validBase, rating: 51 });
    expect(r.success).toBe(false);
  });

  it('rejects negative rating', () => {
    const r = createCheckinSchema.safeParse({ ...validBase, rating: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects description longer than 500 chars', () => {
    const r = createCheckinSchema.safeParse({
      ...validBase,
      description: 'x'.repeat(501),
    });
    expect(r.success).toBe(false);
  });

  it('defaults isPublic to true', () => {
    const r = createCheckinSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isPublic).toBe(true);
  });

  it('accepts isPublic false', () => {
    const r = createCheckinSchema.safeParse({ ...validBase, isPublic: false });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isPublic).toBe(false);
  });
});

describe('updateCheckinSchema', () => {
  it('accepts partial update (only rating)', () => {
    const r = updateCheckinSchema.safeParse({ rating: 30 });
    expect(r.success).toBe(true);
  });

  it('accepts partial update (only description)', () => {
    const r = updateCheckinSchema.safeParse({ description: 'Updated notes' });
    expect(r.success).toBe(true);
  });

  it('accepts empty update', () => {
    const r = updateCheckinSchema.safeParse({});
    expect(r.success).toBe(true);
  });
});
