import { describe, it, expect } from 'vitest';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../modules/auth/auth.schema';

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

describe('verifyEmailSchema', () => {
  it('accepts a token', () => {
    expect(verifyEmailSchema.safeParse({ token: 'abc123' }).success).toBe(true);
  });
  it('rejects an empty token', () => {
    expect(verifyEmailSchema.safeParse({ token: '' }).success).toBe(false);
  });
});

describe('resendVerificationSchema', () => {
  it('accepts a valid email', () => {
    expect(resendVerificationSchema.safeParse({ email: 'user@cafe.com' }).success).toBe(true);
  });
  it('rejects an invalid email', () => {
    expect(resendVerificationSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});
