import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Pure unit tests — no DB, no network ───────────────────────
// We test the schema validation and business rules in isolation.

describe('registerSchema validation', () => {
  const { registerSchema } = await import('../modules/auth/auth.schema');

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      username: 'barista_42',
      email: 'barista@cafe.com',
      password: 'SenhaSegura1!',
      displayName: 'Barista Silva',
    });
    expect(result.success).toBe(true);
  });

  it('rejects username with spaces', () => {
    const result = registerSchema.safeParse({
      username: 'has space',
      email: 'ok@ok.com',
      password: 'password123',
      displayName: 'Name',
    });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.username).toBeDefined();
  });

  it('rejects username with uppercase letters', () => {
    const result = registerSchema.safeParse({
      username: 'BadCase',
      email: 'ok@ok.com',
      password: 'password123',
      displayName: 'Name',
    });
    expect(result.success).toBe(false);
  });

  it('rejects username shorter than 3 chars', () => {
    const result = registerSchema.safeParse({
      username: 'ab',
      email: 'ok@ok.com',
      password: 'password123',
      displayName: 'Name',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      username: 'valid_user',
      email: 'not-an-email',
      password: 'password123',
      displayName: 'Name',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({
      username: 'valid_user',
      email: 'ok@ok.com',
      password: 'short',
      displayName: 'Name',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema validation', () => {
  const { loginSchema } = await import('../modules/auth/auth.schema');

  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'user@test.com', password: 'pass1234' });
    expect(result.success).toBe(true);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@test.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'pass1234' });
    expect(result.success).toBe(false);
  });
});

describe('refreshSchema validation', () => {
  const { refreshSchema } = await import('../modules/auth/auth.schema');

  it('accepts valid refresh token', () => {
    const result = refreshSchema.safeParse({ refreshToken: 'some-long-token-string' });
    expect(result.success).toBe(true);
  });

  it('rejects empty refresh token', () => {
    const result = refreshSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });
});
