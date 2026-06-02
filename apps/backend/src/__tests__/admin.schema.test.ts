import { describe, it, expect } from 'vitest';
import {
  reviewSuggestionSchema,
  listSuggestionsSchema,
  updateUserRoleSchema,
} from '../modules/admin/admin.schema';

describe('reviewSuggestionSchema', () => {
  it('accepts approve action', () => {
    const r = reviewSuggestionSchema.safeParse({ action: 'approve' });
    expect(r.success).toBe(true);
  });

  it('accepts reject action with note', () => {
    const r = reviewSuggestionSchema.safeParse({ action: 'reject', reviewNote: 'Dados incorretos.' });
    expect(r.success).toBe(true);
  });

  it('rejects unknown action', () => {
    const r = reviewSuggestionSchema.safeParse({ action: 'ignore' });
    expect(r.success).toBe(false);
  });

  it('rejects note longer than 300 chars', () => {
    const r = reviewSuggestionSchema.safeParse({ action: 'reject', reviewNote: 'x'.repeat(301) });
    expect(r.success).toBe(false);
  });
});

describe('listSuggestionsSchema', () => {
  it('defaults status to PENDING', () => {
    const r = listSuggestionsSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe('PENDING');
  });

  it('accepts APPROVED status', () => {
    const r = listSuggestionsSchema.safeParse({ status: 'APPROVED' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const r = listSuggestionsSchema.safeParse({ status: 'MAYBE' });
    expect(r.success).toBe(false);
  });

  it('parses page as number', () => {
    const r = listSuggestionsSchema.safeParse({ page: '3' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.page).toBe(3);
  });
});

describe('updateUserRoleSchema', () => {
  it('accepts ADMIN role', () => {
    const r = updateUserRoleSchema.safeParse({ role: 'ADMIN' });
    expect(r.success).toBe(true);
  });

  it('accepts USER role', () => {
    const r = updateUserRoleSchema.safeParse({ role: 'USER' });
    expect(r.success).toBe(true);
  });

  it('rejects unknown role', () => {
    const r = updateUserRoleSchema.safeParse({ role: 'MODERATOR' });
    expect(r.success).toBe(false);
  });
});
