import { redirect } from 'next/navigation';
import { rows, sql } from './db';
import { getStudent } from './auth';
import { TERMO_VERSAO } from './util';

/** Aluno logado que já aceitou o termo (LGPD). Sem login → /login. Sem termo → /treino, que mostra o termo. */
export async function exigirAluno() {
  const st = await getStudent();
  if (!st) redirect('/login');
  const [c] = await rows(sql()`select consent_version from students where id = ${st.id}`);
  if ((c?.consent_version ?? 0) < TERMO_VERSAO) redirect('/treino');
  return st;
}
