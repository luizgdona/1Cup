import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `nodemailer.createTransport` is mocked so no test ever touches the network.
// `vi.hoisted` lets us reference the mock fn from inside the (hoisted) vi.mock
// factory without a TDZ error.
const { createTransportMock } = vi.hoisted(() => {
  return { createTransportMock: vi.fn() };
});

vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportMock },
}));

const baseEnv = {
  NODE_ENV: 'production' as const,
  PORT: 3000,
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
  BCRYPT_ROUNDS: 4,
  SMTP_PORT: 587,
  SMTP_SECURE: false,
};

async function importMailerWithEnv(envOverrides: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock('../config/env', () => ({ env: { ...baseEnv, ...envOverrides } }));
  return import('../shared/utils/mailer');
}

describe('sendMail', () => {
  beforeEach(() => {
    createTransportMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('../config/env');
  });

  it('dev-log: logs to console and never touches the transport', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sendMail } = await importMailerWithEnv({ NODE_ENV: 'development' });

    await expect(
      sendMail({ to: 'user@example.com', subject: 'Assunto', text: 'Corpo do e-mail' })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('production happy path: sends via the smtp transport with from/to/subject/text/html', async () => {
    const transporterSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-1' });
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });

    const { sendMail } = await importMailerWithEnv({
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_PORT: 587,
      SMTP_USER: 'user@example.com',
      SMTP_PASS: 'super-secret',
      SMTP_FROM: 'noreply@1cup.app',
    });

    await expect(
      sendMail({
        to: 'destinatario@example.com',
        subject: '1Cup — Confirme seu e-mail',
        text: 'texto simples',
        html: '<p>html</p>',
      })
    ).resolves.toBeUndefined();

    expect(transporterSendMail).toHaveBeenCalledTimes(1);
    expect(transporterSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining('noreply@1cup.app'),
        to: 'destinatario@example.com',
        subject: '1Cup — Confirme seu e-mail',
        text: 'texto simples',
        html: '<p>html</p>',
      })
    );
  });

  it('derives secure:true when SMTP_PORT is 465', async () => {
    const transporterSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-2' });
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });

    const { sendMail } = await importMailerWithEnv({
      SMTP_HOST: 'smtp.resend.com',
      SMTP_PORT: 465,
      SMTP_SECURE: false,
      SMTP_USER: 'user@example.com',
      SMTP_PASS: 'super-secret',
      SMTP_FROM: 'noreply@1cup.app',
    });

    await sendMail({ to: 'a@b.com', subject: 's', text: 't' });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true })
    );
  });

  it('production without SMTP configured: rejects with a neutral 500 and never calls the transport', async () => {
    const { sendMail } = await importMailerWithEnv({
      SMTP_HOST: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      SMTP_FROM: undefined,
    });

    await expect(sendMail({ to: 'a@b.com', subject: 's', text: 't' })).rejects.toEqual({
      statusCode: 500,
      message: 'Serviço de e-mail não configurado.',
    });

    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('retries once and resolves when the retry succeeds', async () => {
    const transporterSendMail = vi
      .fn()
      .mockRejectedValueOnce(new Error('conexão recusada'))
      .mockResolvedValueOnce({ messageId: 'msg-3' });
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });

    const { sendMail } = await importMailerWithEnv({
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_USER: 'user@example.com',
      SMTP_PASS: 'super-secret',
      SMTP_FROM: 'noreply@1cup.app',
    });

    await expect(sendMail({ to: 'a@b.com', subject: 's', text: 't' })).resolves.toBeUndefined();
    expect(transporterSendMail).toHaveBeenCalledTimes(2);
  });

  it('rejects with a 500 after the retry also fails', async () => {
    const transporterSendMail = vi.fn().mockRejectedValue(new Error('conexão recusada'));
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });

    const { sendMail } = await importMailerWithEnv({
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_USER: 'user@example.com',
      SMTP_PASS: 'super-secret',
      SMTP_FROM: 'noreply@1cup.app',
    });

    await expect(sendMail({ to: 'a@b.com', subject: 's', text: 't' })).rejects.toEqual({
      statusCode: 500,
      message: 'Falha ao enviar e-mail.',
    });
    expect(transporterSendMail).toHaveBeenCalledTimes(2);
  });

  it('reuses a single transporter instance across multiple sendMail calls', async () => {
    const transporterSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-4' });
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });

    const { sendMail } = await importMailerWithEnv({
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_USER: 'user@example.com',
      SMTP_PASS: 'super-secret',
      SMTP_FROM: 'noreply@1cup.app',
    });

    await sendMail({ to: 'a@b.com', subject: 's1', text: 't1' });
    await sendMail({ to: 'a@b.com', subject: 's2', text: 't2' });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(transporterSendMail).toHaveBeenCalledTimes(2);
  });
});

describe('retry classification', () => {
  beforeEach(() => {
    createTransportMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('../config/env');
  });

  const prodEnv = {
    SMTP_HOST: 'smtp-relay.brevo.com',
    SMTP_PORT: 587,
    SMTP_USER: 'user@example.com',
    SMTP_PASS: 'super-secret',
    SMTP_FROM: 'noreply@1cup.app',
  };

  const smtpError = (props: Record<string, unknown>) => Object.assign(new Error('smtp'), props);

  it.each([
    ['a permanent 5xx response', { responseCode: 550 }],
    ['an authentication failure', { code: 'EAUTH', responseCode: 535 }],
  ])('does not retry on %s', async (_label, errProps) => {
    const transporterSendMail = vi.fn().mockRejectedValue(smtpError(errProps));
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });
    const { sendMail } = await importMailerWithEnv(prodEnv);

    await expect(
      sendMail({ to: 'user@example.com', subject: 'Assunto', text: 'Corpo' })
    ).rejects.toMatchObject({ statusCode: 500 });

    // Retrying a permanent rejection burns a request and, when the failure is
    // ambiguous rather than permanent, risks a duplicate email.
    expect(transporterSendMail).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a transient 4xx response', { responseCode: 421 }],
    ['a connection error', { code: 'ECONNECTION' }],
    ['a timeout', { code: 'ETIMEDOUT' }],
  ])('retries on %s', async (_label, errProps) => {
    const transporterSendMail = vi
      .fn()
      .mockRejectedValueOnce(smtpError(errProps))
      .mockResolvedValueOnce({ messageId: 'msg-retry' });
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });
    const { sendMail } = await importMailerWithEnv(prodEnv);

    await expect(
      sendMail({ to: 'user@example.com', subject: 'Assunto', text: 'Corpo' })
    ).resolves.toBeUndefined();

    expect(transporterSendMail).toHaveBeenCalledTimes(2);
  });

  it('retries an unclassified error rather than assuming it is permanent', async () => {
    // Defaulting "unknown" to permanent would silently disable the retry for
    // any error shape not enumerated in isRetryable().
    const transporterSendMail = vi
      .fn()
      .mockRejectedValueOnce(new Error('algo inesperado'))
      .mockResolvedValueOnce({ messageId: 'msg-unknown-retry' });
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });
    const { sendMail } = await importMailerWithEnv(prodEnv);

    await expect(
      sendMail({ to: 'user@example.com', subject: 'Assunto', text: 'Corpo' })
    ).resolves.toBeUndefined();

    expect(transporterSendMail).toHaveBeenCalledTimes(2);
  });
});

describe('maskEmail', () => {
  it('keeps the domain and the first character of the local part', async () => {
    const { maskEmail } = await importMailerWithEnv({ NODE_ENV: 'development' });
    expect(maskEmail('joana.silva@example.com')).toBe('j***@example.com');
  });

  it('does not leak a short local part', async () => {
    const { maskEmail } = await importMailerWithEnv({ NODE_ENV: 'development' });
    expect(maskEmail('a@example.com')).toBe('***@example.com');
  });

  it('never returns the full address', async () => {
    const { maskEmail } = await importMailerWithEnv({ NODE_ENV: 'development' });
    const address = 'user@example.com';
    expect(maskEmail(address)).not.toBe(address);
  });
});

describe('sendMailDetached', () => {
  beforeEach(() => {
    createTransportMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('../config/env');
  });

  it('returns before the transport settles, so callers cannot leak timing', async () => {
    // A hung SMTP server: the send never settles. Awaiting it inside
    // requestPasswordReset would make a known address measurably slower than
    // an unknown one, turning the neutral response into an enumeration oracle.
    let release: (() => void) | undefined;
    const transporterSendMail = vi
      .fn()
      .mockReturnValue(new Promise((resolve) => {
        release = () => resolve({ messageId: 'eventually' });
      }));
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });

    const { sendMailDetached } = await importMailerWithEnv({
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_PORT: 587,
      SMTP_USER: 'user@example.com',
      SMTP_PASS: 'super-secret',
      SMTP_FROM: 'noreply@1cup.app',
    });

    const started = Date.now();
    sendMailDetached({ to: 'user@example.com', subject: 'Assunto', text: 'Corpo' });
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(50);
    expect(transporterSendMail).toHaveBeenCalledTimes(1);
    release?.();
  });

  it('swallows transport failures instead of rejecting the caller', async () => {
    const transporterSendMail = vi.fn().mockRejectedValue(
      Object.assign(new Error('smtp'), { responseCode: 550 })
    );
    createTransportMock.mockReturnValue({ sendMail: transporterSendMail });

    const { sendMailDetached } = await importMailerWithEnv({
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_PORT: 587,
      SMTP_USER: 'user@example.com',
      SMTP_PASS: 'super-secret',
      SMTP_FROM: 'noreply@1cup.app',
    });

    expect(() =>
      sendMailDetached({ to: 'user@example.com', subject: 'Assunto', text: 'Corpo' })
    ).not.toThrow();

    // Let the rejected promise settle; an unhandled rejection would fail the run.
    await new Promise((resolve) => setImmediate(resolve));
  });
});
