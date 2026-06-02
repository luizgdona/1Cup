import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  bio: z.string().max(300).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Nova senha deve ter ao menos 8 caracteres'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
