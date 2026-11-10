'use server';

import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { checkPassword, currentProf, destroySession } from '@/lib/auth';
import { appUrl, sendInviteEmail } from '@/lib/mail';

const str = (f: FormData, k: string, max = 255) => String(f.get(k) ?? '').trim().slice(0, max);
const go = (to: string, msg: string): never => redirect(`${to}?m=${encodeURIComponent(msg)}`);
const perfil = (msg: string): never => go('/admin/perfil', msg);
const profs = (msg: string): never => go('/admin/professores', msg);
const sha = (t: string) => createHash('sha256').update(t).digest('hex');

// ---- perfil ----
/** Nome do professor (aparece no painel e nos convites). */
export async function saveMyName(f: FormData) {
  const me = await currentProf();
  await sql()`update users set name = ${str(f, 'name', 80) || null} where id = ${me.id}`;
  perfil('Nome salvo');
}

/** Alterar a própria senha (pede a atual). */
export async function changePassword(f: FormData) {
  const me = await currentProf();
  const atual = String(f.get('current') ?? ''), nova = String(f.get('password') ?? ''), conf = String(f.get('confirm') ?? '');
  if (nova.length < 8) return perfil('A senha nova precisa ter pelo menos 8 caracteres');
  if (nova.length > 200) return perfil('Senha muito longa');
  if (nova !== conf) return perfil('As duas senhas novas não são iguais');
  if (!(await checkPassword(me.id, atual))) return perfil('Senha atual incorreta');
  await sql()`update users set password_hash = ${await bcrypt.hash(nova, 10)} where id = ${me.id}`;
  perfil('Senha alterada');
}

/**
 * Excluir a própria conta. Três confirmações: senha atual, digitar EXCLUIR e marcar que entende.
 * Os alunos do professor (e todo o histórico deles) são apagados junto. O principal recebe um aviso no painel.
 * O professor principal não pode se excluir: o app ficaria sem responsável.
 */
export async function deleteMyAccount(f: FormData) {
  const me = await currentProf();
  if (me.is_owner) return perfil('Você é o professor principal e não pode excluir a própria conta');
  if (str(f, 'palavra', 20).toUpperCase() !== 'EXCLUIR') return perfil('Para excluir, digite EXCLUIR no campo indicado');
  if (f.get('entendo') !== '1') return perfil('Marque que entende que os alunos e o histórico serão apagados');
  if (!(await checkPassword(me.id, String(f.get('password') ?? '')))) return perfil('Senha incorreta: a conta não foi excluída');
  const s = sql();
  const [{ n }] = await rows(s`select count(*)::int as n from students where owner_id = ${me.id}`);
  await s`insert into account_events (kind, user_email, user_name, students) values ('excluiu_conta', ${me.email}, ${me.name}, ${n})`;
  await s`delete from users where id = ${me.id} and not is_owner`; // cascade: alunos, treinos, histórico, avaliações e modelos dele
  await destroySession();
  redirect('/login?conta=excluida');
}

// ---- professores (só o principal) ----
async function owner() {
  const me = await currentProf();
  if (!me.is_owner) return profs('Só o professor principal pode fazer isso');
  return me;
}

/** Convida outro professor por e-mail. O convite vale 7 dias e uma única vez. */
export async function inviteProfessor(f: FormData) {
  const me = await owner();
  const email = str(f, 'email', 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return profs('Digite um e-mail válido');
  const s = sql();
  if ((await rows(s`select 1 from users where lower(email) = ${email}`)).length) return profs('Este e-mail já é de um professor');
  const [{ n }] = await rows(s`select count(*)::int as n from invites where invited_by = ${me.id} and created_at > now() - interval '1 day'`);
  if (n >= 20) return profs('Muitos convites hoje. Tente amanhã');
  const token = randomBytes(32).toString('base64url');
  await s`delete from invites where lower(email) = ${email} and accepted_at is null`; // um convite pendente por e-mail
  await s`insert into invites (email, token_hash, invited_by, expires_at) values (${email}, ${sha(token)}, ${me.id}, now() + interval '7 days')`;
  try {
    await sendInviteEmail(email, `${appUrl()}/login/convite?t=${token}`, me.name || me.email);
  } catch (e) {
    console.error('convite: falha ao enviar', e);
    await s`delete from invites where token_hash = ${sha(token)}`;
    return profs('Não foi possível enviar o e-mail agora. Tente de novo');
  }
  profs(`Convite enviado para ${email}`);
}

export async function revokeInvite(f: FormData) {
  await owner();
  await sql()`delete from invites where id = ${Number(f.get('id')) | 0} and accepted_at is null`;
  profs('Convite cancelado');
}

/** Desligar o acesso de um professor (confirmado com a senha do principal). Nada é apagado. */
export async function disableProfessor(f: FormData) {
  const me = await owner();
  const id = Number(f.get('id')) | 0;
  if (id === me.id) return profs('Você não pode desligar a própria conta');
  if (!(await checkPassword(me.id, String(f.get('password') ?? '')))) return profs('Senha incorreta: o professor não foi desligado');
  const [u] = await rows(sql()`update users set disabled_at = now() where id = ${id} and not is_owner and disabled_at is null returning coalesce(name, email) as quem`);
  profs(u ? `${u.quem} foi desligado. Os alunos dele continuam treinando` : 'Professor não encontrado');
}

/** Religar um professor desligado (confirmado com a senha do principal). */
export async function enableProfessor(f: FormData) {
  const me = await owner();
  if (!(await checkPassword(me.id, String(f.get('password') ?? '')))) return profs('Senha incorreta: o professor não foi religado');
  const [u] = await rows(sql()`update users set disabled_at = null where id = ${Number(f.get('id')) | 0} and disabled_at is not null returning coalesce(name, email) as quem`);
  profs(u ? `${u.quem} foi religado e já pode entrar` : 'Professor não encontrado');
}

/** Excluir um professor de vez. Só sem alunos (para nunca apagar alunos por engano) e com a senha do principal. */
export async function removeProfessor(f: FormData) {
  const me = await owner();
  const id = Number(f.get('id')) | 0;
  if (id === me.id) return profs('Você não pode excluir a própria conta');
  if (!(await checkPassword(me.id, String(f.get('password') ?? '')))) return profs('Senha incorreta: o professor não foi excluído');
  const s = sql();
  const [{ n }] = await rows(s`select count(*)::int as n from students where owner_id = ${id}`);
  if (n > 0) return profs('Este professor ainda tem alunos. Desligue o acesso em vez de excluir');
  await s`delete from users where id = ${id} and not is_owner`;
  profs('Professor excluído');
}

/** Marca um aviso (ex.: professor excluiu a conta) como visto. */
export async function dismissEvent(f: FormData) {
  await owner();
  await sql()`update account_events set seen_at = now() where id = ${Number(f.get('id')) | 0}`;
  redirect('/admin');
}
