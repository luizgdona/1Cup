import { z } from 'zod';
import { pageField, perPageField } from '../../shared/utils/pagination.schema';

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
  q: z.string().trim().max(120).optional(),
  roasteryId: z.string().cuid().optional(),
  producerId: z.string().cuid().optional(),
  roastColor: RoastColor.optional(),
  processMethod: z.string().trim().max(60).optional(),
  country: z.string().trim().max(60).optional(),
  // Minimum SCA score (coerced from the query string, clamped to 0–100).
  scaMin: z.coerce.number().min(0).max(100).optional().catch(undefined),
  brewMethod: z.string().trim().max(40).optional(),
  sort: z.enum(['name', 'newest', 'score']).default('name'),
  page: pageField,
  perPage: perPageField,
});

// A community edit suggestion may only propose changes to a fixed, safe set of
// fields — never relations, ownership, moderation or timestamp columns. This
// allowlist is the single source of truth used both here (at submission) and in
// admin.service#applyPayload (at approval) to prevent mass-assignment.
export const suggestableCoffeeFields = {
  name: z.string().min(2).max(120),
  variety: z.string().max(80),
  roastColor: RoastColor,
  processMethod: z.string().max(60),
  tastingNotes: z.array(z.string().max(40)).max(20),
  scaScore: z.number().min(0).max(100),
  brewMethods: z.array(z.string().max(40)).max(20),
} as const;

export const createSuggestionSchema = z.object({
  payload: z
    .object(suggestableCoffeeFields)
    .partial()
    .strict()
    .refine((p) => Object.keys(p).length > 0, {
      message: 'A sugestão precisa conter ao menos um campo.',
    }),
});

export type CreateCoffeeInput = z.infer<typeof createCoffeeSchema>;
export type ListCoffeesQuery = z.infer<typeof listCoffeesSchema>;
