import { Resend } from 'resend';

/** Endereço público do app para links em e-mails: nunca vem do pedido (evita link forjado com outro domínio). */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** E-mail de redefinição de senha do professor (Resend, domínio verificado em RESEND_EMAIL_DOMAIN). */
export async function sendResetEmail(to: string, link: string): Promise<void> {
  const key = process.env.RESEND_API_KEY, domain = process.env.RESEND_EMAIL_DOMAIN;
  if (!key || !domain) throw new Error('Resend não configurado (RESEND_API_KEY / RESEND_EMAIL_DOMAIN)');
  const resend = new Resend(key);
  const l = esc(link);
  const { error } = await resend.emails.send({
    from: `fit app <nao-responda@${domain}>`,
    to: [to],
    subject: 'Criar uma nova senha',
    text: `Recebemos um pedido para criar uma nova senha na área do professor.\n\nAbra este link (vale por 1 hora):\n${link}\n\nSe não foi você, ignore este e-mail: sua senha atual continua valendo.`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#111214;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#f5f6f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#1c1d21;border-radius:24px;padding:32px 28px">
<tr><td style="font-size:20px;font-weight:800;padding-bottom:20px">fit app</td></tr>
<tr><td style="font-size:22px;font-weight:800;padding-bottom:10px">Criar uma nova senha</td></tr>
<tr><td style="font-size:15px;line-height:1.5;color:#a4a6b0;padding-bottom:24px">Recebemos um pedido para criar uma nova senha na área do professor. O link vale por 1 hora e só pode ser usado uma vez.</td></tr>
<tr><td style="padding-bottom:24px"><a href="${l}" style="display:inline-block;background:#2f6bff;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 28px;border-radius:999px">Criar nova senha</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#8e919c">Se o botão não abrir, copie este endereço no navegador:<br><a href="${l}" style="color:#79a3ff;word-break:break-all">${l}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#8e919c;padding-top:20px">Se não foi você, ignore este e-mail: sua senha atual continua valendo.</td></tr>
</table></td></tr></table></body></html>`,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
