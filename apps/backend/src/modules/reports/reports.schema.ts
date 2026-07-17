import { z } from 'zod';
import { pageField, perPageField } from '../../shared/utils/pagination.schema';

export const createReportSchema = z.object({
  entityType: z.enum(['CHECKIN', 'COMMENT', 'USER']),
  entityId: z.string().cuid(),
  reason: z.enum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'MISINFORMATION', 'OTHER']),
  note: z.string().trim().max(500).optional(),
});

export const listReportsSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'DISMISSED']).default('PENDING'),
  page: pageField,
  perPage: perPageField,
});

export const reviewReportSchema = z.object({
  action: z.enum(['review', 'dismiss']),
  reviewNote: z.string().trim().max(300).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsSchema>;
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;
