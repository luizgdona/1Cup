import { z } from 'zod';

export const reviewSuggestionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().max(300).optional(),
});

export const listSuggestionsSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  page: z.string().transform(Number).default('1'),
  perPage: z.string().transform(Number).default('20'),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});
