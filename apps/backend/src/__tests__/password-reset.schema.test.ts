import { describe, it, expect } from 'vitest';
import { forgotPasswordSchema, resetPasswordSchema } from '../modules/auth/auth.schema';

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@cafe.com' }).success).toBe(true);
  });
  it('rejects an invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
  it('rejects a missing email', () => {
    expect(forgotPasswordSchema.safeParse({}).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a token + strong-enough password', () => {
    expect(resetPasswordSchema.safeParse({ token: 'abc123', password: 'novaSenha1' }).success).toBe(true);
  });
  it('rejects a short new password', () => {
    expect(resetPasswordSchema.safeParse({ token: 'abc123', password: 'short' }).success).toBe(false);
  });
  it('rejects a missing token', () => {
    expect(resetPasswordSchema.safeParse({ password: 'novaSenha1' }).success).toBe(false);
  });
});
