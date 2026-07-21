/**
 * Pure functions that build the subject/text/html for the transactional
 * emails sent by auth.service.ts. Kept free of side effects (no env, no I/O)
 * so they're trivially unit-testable and reusable regardless of transport.
 */
export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

function wrapHtml(opts: { title: string; bodyHtml: string; ctaUrl: string; ctaLabel: string; footer: string }): string {
  const { title, bodyHtml, ctaUrl, ctaLabel, footer } = opts;
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#f5f1ec;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
      <h1 style="font-size:20px;color:#3c2a21;margin:0 0 16px;">${title}</h1>
      <p style="font-size:14px;line-height:1.6;color:#3c2a21;margin:0 0 24px;">${bodyHtml}</p>
      <p style="margin:0 0 24px;">
        <a href="${ctaUrl}" style="display:inline-block;background-color:#6f4e37;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;">${ctaLabel}</a>
      </p>
      <p style="font-size:12px;color:#6b5b4f;line-height:1.5;margin:0 0 24px;word-break:break-all;">
        Se o botão não funcionar, copie e cole este link no navegador:<br />${ctaUrl}
      </p>
      <p style="font-size:12px;color:#8a7a6d;margin:0;">${footer}</p>
    </div>
  </body>
</html>`;
}

/** Builds the "confirm your email" message sent on registration / resend. */
export function buildVerificationEmail(verifyUrl: string, ttlHours: number): MailContent {
  const subject = '1Cup — Confirme seu e-mail';
  const text = `Bem-vindo ao 1Cup! Confirme seu e-mail abrindo o link abaixo (válido por ${ttlHours}h):\n${verifyUrl}`;
  const html = wrapHtml({
    title: 'Bem-vindo ao 1Cup!',
    bodyHtml: `Confirme seu e-mail para ativar sua conta. Este link é válido por ${ttlHours} horas.`,
    ctaUrl: verifyUrl,
    ctaLabel: 'Confirmar e-mail',
    footer: 'Se você não criou uma conta no 1Cup, ignore este e-mail.',
  });

  return { subject, text, html };
}

/** Builds the password-reset message sent from requestPasswordReset. */
export function buildPasswordResetEmail(resetUrl: string, ttlMinutes: number): MailContent {
  const subject = '1Cup — Redefinição de senha';
  const text = `Recebemos um pedido para redefinir sua senha.\n\nAbra o link abaixo (válido por ${ttlMinutes} minutos):\n${resetUrl}\n\nSe não foi você, ignore este e-mail.`;
  const html = wrapHtml({
    title: 'Redefinição de senha',
    bodyHtml: `Recebemos um pedido para redefinir sua senha. Este link é válido por ${ttlMinutes} minutos.`,
    ctaUrl: resetUrl,
    ctaLabel: 'Redefinir senha',
    footer: 'Se não foi você, ignore este e-mail. Sua senha não será alterada.',
  });

  return { subject, text, html };
}
