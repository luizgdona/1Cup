import { describe, it, expect } from 'vitest';
import { createReportSchema, reviewReportSchema, listReportsSchema } from '../modules/reports/reports.schema';

const validId = 'clxxxxxxxxxxxxxxx0000000000';

describe('createReportSchema', () => {
  it('accepts a valid report', () => {
    const r = createReportSchema.safeParse({ entityType: 'CHECKIN', entityId: validId, reason: 'SPAM' });
    expect(r.success).toBe(true);
  });
  it('rejects an unknown entity type', () => {
    expect(createReportSchema.safeParse({ entityType: 'PHOTO', entityId: validId, reason: 'SPAM' }).success).toBe(false);
  });
  it('rejects an unknown reason', () => {
    expect(createReportSchema.safeParse({ entityType: 'USER', entityId: validId, reason: 'BECAUSE' }).success).toBe(false);
  });
  it('rejects a non-cuid entity id', () => {
    expect(createReportSchema.safeParse({ entityType: 'USER', entityId: 'not-a-cuid', reason: 'SPAM' }).success).toBe(false);
  });
});

describe('reviewReportSchema', () => {
  it('accepts review/dismiss actions', () => {
    expect(reviewReportSchema.safeParse({ action: 'review' }).success).toBe(true);
    expect(reviewReportSchema.safeParse({ action: 'dismiss', reviewNote: 'ok' }).success).toBe(true);
  });
  it('rejects an unknown action', () => {
    expect(reviewReportSchema.safeParse({ action: 'delete' }).success).toBe(false);
  });
});

describe('listReportsSchema', () => {
  it('defaults status to PENDING and bounds pagination', () => {
    const r = listReportsSchema.parse({ perPage: '99999' });
    expect(r.status).toBe('PENDING');
    expect(r.perPage).toBeLessThanOrEqual(100);
  });
});
