import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { sql } from './db';

const COOKIE = 'sess';
const STU = 'stu';
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET!);
const cookieOpts = (days: number) => ({ httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: days * 86400 });

export async function createSession(uid: number) {
  const jwt = await new SignJWT({ uid }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(key());
  (await cookies()).set(COOKIE, jwt, cookieOpts(7));
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return false;
  try { await jwtVerify(t, key()); return true; } catch { return false; }
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/login');
}

// ---- aluno: sessão por código de 6 dígitos ----
export async function createStudentSession(sid: number, code: string) {
  const jwt = await new SignJWT({ sid, code }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30d').sign(key());
  (await cookies()).set(STU, jwt, cookieOpts(30));
}

export async function destroyStudentSession() {
  (await cookies()).delete(STU);
}

type Student = { id: number; name: string; notes: string | null };

/** Aluno logado. Confere o código atual no banco: gerar novo código derruba o acesso antigo. */
export async function getStudent(): Promise<Student | null> {
  const t = (await cookies()).get(STU)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    const [st] = (await sql()`select id, name, notes from students where id = ${Number(payload.sid)} and access_code = ${String(payload.code)}`) as Student[];
    return st ?? null;
  } catch { return null; }
}
