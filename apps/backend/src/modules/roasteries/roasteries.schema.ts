import { z } from 'zod';

export const createRoasterySchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().max(60).default('Brasil'),
  instagram: z.string().max(60).optional(),
  website: z.string().url().max(200).optional(),
});

export const listRoasteriesSchema = z.object({
  q: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  perPage: z.string().transform(Number).default('20'),
});

export type CreateRoasteryInput = z.infer<typeof createRoasterySchema>;
