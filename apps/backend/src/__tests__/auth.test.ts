import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshSchema } from '../modules/auth/auth.schema';

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const r = registerSchema.safeParse({
      username: 'barista_42', email: 'barista@cafe.com',
      password: 'SenhaSegura1!', displayName: 'Barista Silva',
    });
    expect(r.success).toBe(true);
  });
  it('rejects username with spaces', () => {
    const r = registerSchema.safeParse({ username: 'has space', email: 'ok@ok.com', password: 'password123', displayName: 'N' });
    expect(r.success).toBe(false);
  });
  it('rejects uppercase username', () => {
    const r = registerSchema.safeParse({ username: 'BadCase', email: 'ok@ok.com', password: 'password123', displayName: 'N' });
    expect(r.success).toBe(false);
  });
  it('rejects short username', () => {
    const r = registerSchema.safeParse({ username: 'ab', email: 'ok@ok.com', password: 'password123', displayName: 'N' });
    expect(r.success).toBe(false);
  });
  it('rejects invalid email', () => {
    const r = registerSchema.safeParse({ username: 'valid_user', email: 'not-an-email', password: 'password123', displayName: 'N' });
    expect(r.success).toBe(false);
  });
  it('rejects short password', () => {
    const r = registerSchema.safeParse({ username: 'valid_user', email: 'ok@ok.com', password: 'short', displayName: 'N' });
    expect(r.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const r = loginSchema.safeParse({ email: 'user@test.com', password: 'pass1234' });
    expect(r.success).toBe(true);
  });
  it('rejects empty password', () => {
    const r = loginSchema.safeParse({ email: 'user@test.com', password: '' });
    expect(r.success).toBe(false);
  });
  it('rejects invalid email', () => {
    const r = loginSchema.safeParse({ email: 'not-email', password: 'pass1234' });
    expect(r.success).toBe(false);
  });
});

describe('refreshSchema', () => {
  it('accepts valid refresh token', () => {
    const r = refreshSchema.safeParse({ refreshToken: 'some-long-token-string' });
    expect(r.success).toBe(true);
  });
  it('rejects empty refresh token', () => {
    const r = refreshSchema.safeParse({ refreshToken: '' });
    expect(r.success).toBe(false);
  });
});
