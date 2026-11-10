'use server';

import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { createSession, createStudentSession, destroySession, destroyStudentSession } from '@/lib/auth';
import { sendResetLink, sha } from '@/lib/reset';

// 5 erros por IP e por tipo de acesso bloqueiam por 15 minutos
async function throttle(kind: string): Promise<{ key: string; blocked: boolean }> {
  const ip = ((await headers()).get('x-forwarded-for') ?? 'local').split(',')[0].trim().slice(0, 40);
  const key = `${kind}:${ip}`;
  const s = sql();
  await s`delete from login_attempts where created_at < now() - interval '1 day'`;
  const [{ n }] = await rows(s`select count(*)::int as n from login_attempts where ip = ${key} and created_at > now() - interval '15 minutes'`);
  return { key, blocked: n >= 5 };
}

export async function login(_prev: string, form: FormData): Promise<string> {
  const { key, blocked } = await throttle('prof');
  if (blocked) return 'Muitas tentativas. Aguarde 15 minutos.';

  const s = sql();
  const email = String(form.get('email') ?? '').trim();
  const [u] = await rows(s`select id, password_hash, disabled_at from users where lower(email) = lower(${email})`);
  if (u && (await bcrypt.compare(String(form.get('password') ?? ''), u.password_hash))) {
    await s`delete from login_attempts where ip = ${key}`;
    if (u.disabled_at) return 'Seu acesso foi desligado pelo professor responsável. Fale com ele para religar.';
    await createSession(u.id);
    redirect('/admin');
  }
  await s`insert into login_attempts (ip) values (${key})`;
  return 'E-mail ou senha incorretos.';
}

export async function logout() {
  await destroySession();
  redirect('/login');
}

export async function studentLogin(_prev: string, form: FormData): Promise<string> {
  const { key, blocked } = await throttle('aluno');
  if (blocked) return 'Muitas tentativas. Aguarde 15 minutos.';

  const code = String(form.get('code') ?? '').replace(/\D/g, '');
  const s = sql();
  const [st] = code.length === 6 ? await rows(s`select id from students where access_code = ${code}`) : [];
  if (!st) {
    await s`insert into login_attempts (ip) values (${key})`;
    return 'Código incorreto. Confira com o seu professor.';
  }
  await s`delete from login_attempts where ip = ${key}`;
  await createStudentSession(st.id, code);
  redirect('/treino');
}

export async function studentLogout() {
  await destroyStudentSession();
  redirect('/login');
}

// ---- esqueci minha senha (professor) ----
const OK_RESET = 'ok:Se este e-mail for de um professor cadastrado, enviamos um link para criar uma nova senha. Confira a caixa de entrada e o spam.';

/** Pede o link por e-mail. A resposta é sempre a mesma, exista o e-mail ou não. */
export async function requestReset(_prev: string, form: FormData): Promise<string> {
  const { key, blocked } = await throttle('reset');
  if (blocked) return 'Muitas tentativas. Aguarde 15 minutos.';
  const email = String(form.get('email') ?? '').trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Digite um e-mail válido.';
  const s = sql();
  await s`insert into login_attempts (ip) values (${key})`; // cada pedido conta: no máximo 5 a cada 15 min
  const [u] = await rows(s`select id, email from users where lower(email) = lower(${email})`);
  if (u) await sendResetLink(u.id, u.email);
  return OK_RESET;
}

/** Cria a senha nova a partir do link e entra na área do professor. */
export async function resetPassword(_prev: string, form: FormData): Promise<string> {
  const token = String(form.get('t') ?? ''), pw = String(form.get('password') ?? ''), pw2 = String(form.get('confirm') ?? '');
  if (pw.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (pw.length > 200) return 'Senha muito longa.';
  if (pw !== pw2) return 'As duas senhas não são iguais.';
  const s = sql();
  const [r] = token ? await rows(s`select id, user_id from password_resets where token_hash = ${sha(token)} and used_at is null and expires_at > now()`) : [];
  if (!r) return 'Este link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".';
  const hash = await bcrypt.hash(pw, 10);
  await s`update users set password_hash = ${hash} where id = ${r.user_id}`;
  await s`update password_resets set used_at = now() where user_id = ${r.user_id} and used_at is null`;
  await createSession(r.user_id);
  redirect('/admin?m=' + encodeURIComponent('Senha nova criada'));
}

// ---- convite de professor ----
/** Cria a conta do professor convidado (nome e senha) e entra no painel. */
export async function acceptInvite(_prev: string, form: FormData): Promise<string> {
  const token = String(form.get('t') ?? ''), name = String(form.get('name') ?? '').trim().slice(0, 80);
  const pw = String(form.get('password') ?? ''), pw2 = String(form.get('confirm') ?? '');
  if (name.length < 2) return 'Digite seu nome.';
  if (pw.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (pw.length > 200) return 'Senha muito longa.';
  if (pw !== pw2) return 'As duas senhas não são iguais.';
  const s = sql();
  const [inv] = token ? await rows(s`select id, email from invites where token_hash = ${sha(token)} and accepted_at is null and expires_at > now()`) : [];
  if (!inv) return 'Este convite expirou ou já foi usado. Peça um novo ao professor responsável.';
  if ((await rows(s`select 1 from users where lower(email) = lower(${inv.email})`)).length) return 'Já existe uma conta com este e-mail. Use "Entrar" ou "Esqueci minha senha".';
  const [u] = await rows(s`insert into users (email, password_hash, name) values (${inv.email}, ${await bcrypt.hash(pw, 10)}, ${name}) returning id`);
  await s`update invites set accepted_at = now() where id = ${inv.id}`;
  await createSession(u.id);
  redirect('/admin?m=' + encodeURIComponent('Bem-vindo! Comece cadastrando seus alunos'));
}
