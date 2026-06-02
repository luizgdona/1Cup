import { z } from 'zod';

export const respondRequestSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

export const searchUsersSchema = z.object({
  q: z.string().min(1),
  page: z.string().transform(Number).default('1'),
  perPage: z.string().transform(Number).default('20'),
});
