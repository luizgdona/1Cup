import nodemailer, { type Transporter } from 'nodemailer';
import pino from 'pino';

import { env } from '../../config/env';
import { runDetached } from './background';

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


/**
 * Redacts a recipient for logging. Delivery diagnostics need to correlate a
 * failure with a domain, not to copy every user's address into centralized log
 * storage.
 */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf('@');
  if (at <= 0) return '***';

  const local = address.slice(0, at);
  const domain = address.slice(at);
  return local.length > 1 ? `${local[0]}***${domain}` : `***${domain}`;
}

/**
 * Reduces an SMTP failure to an allowlist of diagnostics.
 *
 * The raw nodemailer error is not safe to log: `response`, `rejected` and
 * `rejectedErrors` routinely echo the recipient mailbox back, so logging the
 * error object would leak the address that masking `to` was meant to protect.
 */
export function sanitizeSmtpError(err: unknown): {
  code?: string;
  responseCode?: number;
  command?: string;
} {
  if (typeof err !== 'object' || err === null) return {};

  const { code, responseCode, command } = err as {
    code?: unknown;
    responseCode?: unknown;
    command?: unknown;
  };

  return {
    ...(typeof code === 'string' ? { code } : {}),
    ...(typeof responseCode === 'number' ? { responseCode } : {}),
    ...(typeof command === 'string' ? { command } : {}),
  };
}

/**
 * Whether a failed send is worth retrying.
 *
 * Only failures we can positively identify as permanent are refused: an SMTP
 * 5xx (mailbox rejected, message refused) and authentication errors will fail
 * identically on a second attempt, so retrying just burns a request.
 *
 * Everything else — 4xx, connection resets, timeouts, and errors carrying no
 * classification at all — is retried. Defaulting *unknown* to "permanent"
 * would quietly disable the retry for any error shape not enumerated here,
 * which is the more damaging mistake of the two.
 */
function isRetryable(err: unknown): boolean {
  const { responseCode, code } = (err ?? {}) as { responseCode?: number; code?: string };

  if (typeof responseCode === 'number' && responseCode >= 500) return false;
  if (code === 'EAUTH' && (typeof responseCode !== 'number' || responseCode >= 500)) return false;

  return true;
}

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

  const to = maskEmail(mail.to);

  try {
    const info = await getTransporter().sendMail(payload);
    logger.info({ messageId: info.messageId, to }, 'e-mail enviado com sucesso');
    return;
  } catch (firstErr) {
    if (!isRetryable(firstErr)) {
      logger.error({ err: sanitizeSmtpError(firstErr), to }, 'falha permanente ao enviar e-mail');
      throw { statusCode: 500, message: 'Falha ao enviar e-mail.' };
    }

    logger.warn({ err: sanitizeSmtpError(firstErr), to }, 'falha transitória ao enviar e-mail, tentando novamente');
    await delay(RETRY_BACKOFF_MS);

    try {
      const info = await getTransporter().sendMail(payload);
      logger.info({ messageId: info.messageId, to }, 'e-mail enviado com sucesso (retry)');
      return;
    } catch (secondErr) {
      logger.error({ err: sanitizeSmtpError(secondErr), to }, 'falha ao enviar e-mail após retry');
      throw { statusCode: 500, message: 'Falha ao enviar e-mail.' };
    }
  }
}

/**
 * Fire-and-forget send: starts delivery and returns immediately.
 *
 * Auth flows must use this rather than awaiting `sendMail`. Awaiting made the
 * response time depend on SMTP, so `/auth/forgot-password` answered instantly
 * for an unknown address and only after a round trip (up to two socket
 * timeouts) for a registered one — a timing oracle that defeated the neutral
 * response message. It also keeps an SMTP outage from blocking registration
 * and password-reset requests.
 *
 * Registered with the shared background-task registry so shutdown can drain
 * it — otherwise a deploy restart between the HTTP response and the SMTP
 * handshake would silently drop a verification or reset email, and with
 * `requireVerified` gating content, that leaves the user stuck.
 */
export function sendMailDetached(mail: Mail): void {
  // sendMail already logged the failure with a sanitized error on every
  // rejecting path, so runDetached's own logging would double every
  // delivery-failure count and alert. Swallow here to keep a single log.
  runDetached('sendMail', () => sendMail(mail).catch(() => {}));
}
