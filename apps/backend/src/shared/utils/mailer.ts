import nodemailer, { type Transporter } from 'nodemailer';
import pino from 'pino';

import { env } from '../../config/env';

const logger = pino({ name: 'mailer' });

/**
 * Minimal mail abstraction.
 *
 * In development the message is logged (never sent for real, even if
 * SMTP_* happens to be set) so flows like password reset stay fully
 * testable end-to-end without an inbox. In production it sends through a
 * generic SMTP transport (nodemailer) so swapping providers (Brevo,
 * Resend, SES, ...) is only an env var change.
 *
 * No queue/retry-with-backoff-forever here: a single immediate retry is
 * enough for transient SMTP hiccups. If email volume grows enough that
 * this needs durability guarantees, the next step is a BullMQ/Redis job
 * queue instead of inline retries.
 */
export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRY_BACKOFF_MS = 500;

export async function sendMail(mail: Mail): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    // Dev / test: log instead of sending. Never do this in production.
    // eslint-disable-next-line no-console
    console.log(`✉️  [dev mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }

  const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);
  if (!smtpConfigured) {
    throw { statusCode: 500, message: 'Serviço de e-mail não configurado.' };
  }

  const payload = {
    from: `"1Cup" <${env.SMTP_FROM}>`,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  };

  try {
    const info = await getTransporter().sendMail(payload);
    logger.info({ messageId: info.messageId, to: mail.to }, 'e-mail enviado com sucesso');
    return;
  } catch (firstErr) {
    logger.warn({ err: firstErr, to: mail.to }, 'falha ao enviar e-mail, tentando novamente');
    await delay(RETRY_BACKOFF_MS);

    try {
      const info = await getTransporter().sendMail(payload);
      logger.info({ messageId: info.messageId, to: mail.to }, 'e-mail enviado com sucesso (retry)');
      return;
    } catch (secondErr) {
      logger.error({ err: secondErr, to: mail.to }, 'falha ao enviar e-mail após retry');
      throw { statusCode: 500, message: 'Falha ao enviar e-mail.' };
    }
  }
}
