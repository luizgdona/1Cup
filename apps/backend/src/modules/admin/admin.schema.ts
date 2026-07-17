import { z } from 'zod';
import { pageField, perPageField } from '../../shared/utils/pagination.schema';

export const reviewSuggestionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().max(300).optional(),
});

export const listSuggestionsSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  page: pageField,
  perPage: perPageField,
});

export const listUsersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: pageField,
  perPage: perPageField,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});
