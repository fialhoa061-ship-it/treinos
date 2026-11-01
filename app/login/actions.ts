'use server';

import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { createSession, createStudentSession, destroySession, destroyStudentSession } from '@/lib/auth';

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
  const [u] = await rows(s`select id, password_hash from users where email = ${email}`);
  if (u && (await bcrypt.compare(String(form.get('password') ?? ''), u.password_hash))) {
    await s`delete from login_attempts where ip = ${key}`;
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
