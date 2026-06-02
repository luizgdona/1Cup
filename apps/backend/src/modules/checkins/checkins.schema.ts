import { z } from 'zod';

export const createCheckinSchema = z.object({
  coffeeId: z.string().cuid(),
  // Rating: 0–50 (meia estrela = 5 pontos, 1 estrela = 10 pontos, ..., 5 estrelas = 50)
  rating: z.number().int().min(0).max(50),
  description: z.string().max(500).optional(),
  brewMethod: z.string().max(60).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  locationName: z.string().max(120).optional(),
  isPublic: z.boolean().default(true),
});

export const updateCheckinSchema = createCheckinSchema.partial().omit({ coffeeId: true });

export type CreateCheckinInput = z.infer<typeof createCheckinSchema>;
export type UpdateCheckinInput = z.infer<typeof updateCheckinSchema>;
