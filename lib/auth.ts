import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE = 'sess';
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function createSession(uid: number) {
  const jwt = await new SignJWT({ uid }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(key());
  (await cookies()).set(COOKIE, jwt, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 7 * 86400 });
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
