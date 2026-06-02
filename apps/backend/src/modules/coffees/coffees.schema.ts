import { z } from 'zod';

const RoastColor = z.enum(['LIGHT', 'LIGHT_MEDIUM', 'MEDIUM', 'MEDIUM_DARK', 'DARK']);

export const createCoffeeSchema = z.object({
  name: z.string().min(2).max(120),
  roasteryId: z.string().cuid(),
  producerId: z.string().cuid().optional(),
  variety: z.string().max(80).optional(),
  roastColor: RoastColor.optional(),
  processMethod: z.string().max(60).optional(),
  tastingNotes: z.array(z.string().max(40)).default([]),
  scaScore: z.number().min(0).max(100).optional(),
  brewMethods: z.array(z.string().max(40)).default([]),
});

export const listCoffeesSchema = z.object({
  q: z.string().optional(),
  roasteryId: z.string().optional(),
  producerId: z.string().optional(),
  roastColor: RoastColor.optional(),
  page: z.string().transform(Number).default('1'),
  perPage: z.string().transform(Number).default('20'),
});

export const createSuggestionSchema = z.object({
  payload: z.record(z.unknown()),
});

export type CreateCoffeeInput = z.infer<typeof createCoffeeSchema>;
export type ListCoffeesQuery = z.infer<typeof listCoffeesSchema>;
