import { describe, it, expect } from 'vitest';
import { createCommentSchema } from '../modules/comments/comments.schema';

describe('createCommentSchema', () => {
  it('accepts a normal comment', () => {
    expect(createCommentSchema.safeParse({ body: 'Que café incrível!' }).success).toBe(true);
  });
  it('trims and rejects whitespace-only', () => {
    expect(createCommentSchema.safeParse({ body: '   ' }).success).toBe(false);
  });
  it('rejects an empty body', () => {
    expect(createCommentSchema.safeParse({ body: '' }).success).toBe(false);
  });
  it('rejects a body over 500 chars', () => {
    expect(createCommentSchema.safeParse({ body: 'x'.repeat(501) }).success).toBe(false);
  });
});
