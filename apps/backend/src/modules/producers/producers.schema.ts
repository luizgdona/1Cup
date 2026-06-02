import { z } from 'zod';

export const createProducerSchema = z.object({
  name: z.string().min(2).max(120),
  farmName: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().max(60).default('Brasil'),
  altitude: z.string().max(40).optional(),
});

export const listProducersSchema = z.object({
  q: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  perPage: z.string().transform(Number).default('20'),
});

export type CreateProducerInput = z.infer<typeof createProducerSchema>;
