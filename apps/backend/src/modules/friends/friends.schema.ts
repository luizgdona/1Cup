import { z } from 'zod';
import { pageField, perPageField } from '../../shared/utils/pagination.schema';

export const respondRequestSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

export const searchUsersSchema = z.object({
  q: z.string().trim().min(1).max(80),
  page: pageField,
  perPage: perPageField,
});

export const userIdParamSchema = z.object({
  userId: z.string().cuid(),
});
