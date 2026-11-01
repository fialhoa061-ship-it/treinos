'use server';

import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';

export async function login(_prev: string, form: FormData): Promise<string> {
  const ip = ((await headers()).get('x-forwarded-for') ?? 'local').split(',')[0].trim().slice(0, 45);
  const s = sql();
  await s`delete from login_attempts where created_at < now() - interval '1 day'`;
  const [{ n }] = await rows(s`select count(*)::int as n from login_attempts where ip = ${ip} and created_at > now() - interval '15 minutes'`);
  if (n >= 5) return 'Muitas tentativas. Aguarde 15 minutos.';

  const email = String(form.get('email') ?? '').trim();
  const [u] = await rows(s`select id, password_hash from users where email = ${email}`);
  if (u && (await bcrypt.compare(String(form.get('password') ?? ''), u.password_hash))) {
    await s`delete from login_attempts where ip = ${ip}`;
    await createSession(u.id);
    redirect('/admin');
  }
  await s`insert into login_attempts (ip) values (${ip})`;
  return 'E-mail ou senha incorretos.';
}

export async function logout() {
  await destroySession();
  redirect('/login');
}
