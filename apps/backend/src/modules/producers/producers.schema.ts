import { z } from 'zod';
import { pageField, perPageField } from '../../shared/utils/pagination.schema';

export const createProducerSchema = z.object({
  name: z.string().min(2).max(120),
  farmName: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().max(60).default('Brasil'),
  altitude: z.string().max(40).optional(),
});

export const listProducersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: pageField,
  perPage: perPageField,
});

export type CreateProducerInput = z.infer<typeof createProducerSchema>;
