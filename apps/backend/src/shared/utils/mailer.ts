import { env } from '../../config/env';

/**
 * Minimal mail abstraction.
 *
 * This project ships without an SMTP client dependency yet. In development the
 * message is logged so flows (e.g. password reset) are fully testable end-to-end.
 * In production, wire a real transport here (e.g. nodemailer with the SMTP_*
 * env vars) — the call sites already pass everything needed.
 */
export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

  if (!smtpConfigured || env.NODE_ENV !== 'production') {
    // Dev / not-configured: log instead of sending. Never do this in production.
    // eslint-disable-next-line no-console
    console.log(`✉️  [dev mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }

  // TODO(prod): integrate an SMTP transport (nodemailer) using env.SMTP_* here.
  // Left as an explicit hook so production deploys must opt in consciously.
  throw { statusCode: 500, message: 'Serviço de e-mail não configurado.' };
}
