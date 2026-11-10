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

/** Id do professor logado, ou null. Conta excluída ou desligada pelo principal derruba a sessão na hora. */
export async function adminId(): Promise<number | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  let uid: number;
  try { uid = Number((await jwtVerify(t, key())).payload.uid); } catch { return null; }
  if (!uid) return null;
  const ok = (await sql()`select 1 from users where id = ${uid} and disabled_at is null`) as unknown[];
  return ok.length ? uid : null;
}

/** Confere a senha do professor (confirmação de ações sensíveis). */
export async function checkPassword(uid: number, pw: string): Promise<boolean> {
  const { default: bcrypt } = await import('bcryptjs');
  const [u] = (await sql()`select password_hash from users where id = ${uid}`) as { password_hash: string }[];
  return !!u && pw.length > 0 && (await bcrypt.compare(pw, u.password_hash));
}

export async function isAdmin(): Promise<boolean> {
  return (await adminId()) !== null;
}

/** Exige professor logado e devolve o id dele (dono dos alunos). */
export async function requireAdmin(): Promise<number> {
  const uid = await adminId();
  if (!uid) redirect('/login');
  return uid;
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

/** Professor logado com nome e se é o dono (quem convida outros professores). */
export type Prof = { id: number; email: string; name: string | null; is_owner: boolean };
export async function currentProf(): Promise<Prof> {
  const uid = await requireAdmin();
  const [u] = (await sql()`select id, email, name, is_owner from users where id = ${uid}`) as Prof[];
  if (!u) redirect('/login');
  return u;
}
