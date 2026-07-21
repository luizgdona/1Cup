import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    S3_ENDPOINT: z.string().url(),
    S3_BUCKET: z.string(),
    S3_ACCESS_KEY: z.string(),
    S3_SECRET_KEY: z.string(),
    S3_PUBLIC_URL: z.string().url(),
    CORS_ORIGIN: z.string().default('http://localhost:3001'),
    BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
    SMTP_HOST: z.string().optional(),
    // `transform(Number)` alone would let "abc" (NaN), "587.5" and "70000"
    // through and only blow up at connection time, defeating the fail-fast
    // validation below.
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().email().optional(),
  })
  .superRefine((val, ctx) => {
    // Em produção o transporte de e-mail é obrigatório: falhar rápido no boot
    // é melhor do que descobrir dias depois que reset de senha / verificação
    // de e-mail está quebrado silenciosamente.
    if (val.NODE_ENV !== 'production') return;

    // Checa o comprimento após trim: `SMTP_HOST="   "` é truthy mas inutilizável,
    // e passaria pela validação só para falhar em todo envio em runtime.
    const requiredWhenProduction = [
      ['SMTP_HOST', val.SMTP_HOST],
      ['SMTP_USER', val.SMTP_USER],
      ['SMTP_PASS', val.SMTP_PASS],
      ['SMTP_FROM', val.SMTP_FROM],
    ] as const;

    for (const [name, value] of requiredWhenProduction) {
      if (!value?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [name],
          message: `${name} é obrigatório em produção (transporte de e-mail).`,
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
