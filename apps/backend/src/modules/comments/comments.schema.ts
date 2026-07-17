import { z } from 'zod';
import { pageField, perPageField } from '../../shared/utils/pagination.schema';

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comentário vazio.').max(500),
});

export const listCommentsSchema = z.object({
  page: pageField,
  perPage: perPageField,
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
