import { createHash, randomBytes } from 'node:crypto';
import { sql } from './db';
import { appUrl, sendResetEmail } from './mail';

export const sha = (t: string) => createHash('sha256').update(t).digest('hex');

/**
 * Cria o link de "criar nova senha" (vale 1 hora, uso único; só o último link vale) e envia por e-mail.
 * Usado pelo "Esqueci minha senha" do login e pelo "Esqueci minha senha atual" do Perfil.
 * Devolve false se o e-mail não pôde ser enviado.
 */
export async function sendResetLink(userId: number, email: string): Promise<boolean> {
  const s = sql();
  const token = randomBytes(32).toString('base64url');
  await s`update password_resets set used_at = now() where user_id = ${userId} and used_at is null`;
  await s`insert into password_resets (user_id, token_hash, expires_at) values (${userId}, ${sha(token)}, now() + interval '1 hour')`;
  try { await sendResetEmail(email, `${appUrl()}/login/redefinir?t=${token}`); return true; }
  catch (e) { console.error('reset: falha ao enviar e-mail', e); return false; }
}
