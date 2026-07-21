import { describe, it, expect } from 'vitest';
import { envSchema } from '../config/env';

// Base valid env, mirroring setup.ts, but overridable per test.
const baseEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-characters-long!!',
  JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-characters-long!',
  S3_ENDPOINT: 'https://test.r2.cloudflarestorage.com',
  S3_BUCKET: 'test-bucket',
  S3_ACCESS_KEY: 'test-key',
  S3_SECRET_KEY: 'test-secret',
  S3_PUBLIC_URL: 'https://media.test.app',
  CORS_ORIGIN: 'http://localhost:3001',
  BCRYPT_ROUNDS: '4',
};

const smtpEnv = {
  SMTP_HOST: 'smtp-relay.brevo.com',
  SMTP_PORT: '587',
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'super-secret',
  SMTP_FROM: 'noreply@1cup.app',
};

describe('envSchema', () => {
  it('fails in production without SMTP_HOST/USER/PASS/FROM', () => {
    const result = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'production' });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Assert on each field individually: a looser check (e.g. "the serialized
      // error mentions SMTP") would still pass if validation for three of the
      // four fields were dropped.
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('SMTP_HOST');
      expect(paths).toContain('SMTP_USER');
      expect(paths).toContain('SMTP_PASS');
      expect(paths).toContain('SMTP_FROM');
    }
  });

  it.each(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const)(
    'fails in production when %s is present but whitespace-only',
    (field) => {
      const result = envSchema.safeParse({
        ...baseEnv,
        NODE_ENV: 'production',
        ...smtpEnv,
        [field]: '   ',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain(field);
      }
    }
  );

  it.each([
    ['not a number', 'abc'],
    ['zero', '0'],
    ['negative', '-1'],
    ['above the TCP range', '70000'],
    ['fractional', '587.5'],
  ])('rejects SMTP_PORT that is %s', (_label, port) => {
    const result = envSchema.safeParse({ ...baseEnv, SMTP_PORT: port });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain('SMTP_PORT');
    }
  });

  it('accepts a valid SMTP_PORT and exposes it as a number', () => {
    const result = envSchema.safeParse({ ...baseEnv, SMTP_PORT: '465' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SMTP_PORT).toBe(465);
    }
  });

  it('succeeds in production with all SMTP_* vars set', () => {
    const result = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'production', ...smtpEnv });
    expect(result.success).toBe(true);
  });

  it('succeeds in development without SMTP (preserves current behavior)', () => {
    const result = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'development' });
    expect(result.success).toBe(true);
  });

  it('succeeds in test without SMTP (preserves current behavior)', () => {
    const result = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'test' });
    expect(result.success).toBe(true);
  });

  it('defaults SMTP_SECURE to false when absent', () => {
    const result = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'development' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SMTP_SECURE).toBe(false);
    }
  });

  it('parses SMTP_SECURE="true" as boolean true', () => {
    const result = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'development', SMTP_SECURE: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SMTP_SECURE).toBe(true);
    }
  });

  it('defaults SMTP_PORT to 587 (number) when absent', () => {
    const result = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'development' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SMTP_PORT).toBe(587);
      expect(typeof result.data.SMTP_PORT).toBe('number');
    }
  });
});
