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
