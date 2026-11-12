'use server';

import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { getStudent } from '@/lib/auth';
import { KINDS_ALUNO } from '@/lib/jogo';

const MAX = 6; // metas pessoais por aluno, para a tela não virar uma lista sem fim
const FAIXA = { sessions: [1, 300], diet_days: [1, 366], water_days: [1, 366] } as const;
const str = (f: FormData, k: string, max = 255) => String(f.get(k) ?? '').trim().slice(0, max);
const volta = (msg: string): never => redirect(`/treino/metas?m=${encodeURIComponent(msg)}`);

/** O aluno cria a própria meta (treinos, dieta ou água até uma data). */
export async function criarMetaPessoal(f: FormData) {
  const st = await getStudent();
  if (!st) redirect('/login');
  const kind = str(f, 'kind', 20) as (typeof KINDS_ALUNO)[number];
  if (!KINDS_ALUNO.includes(kind)) return volta('Escolha o tipo da meta');
  const alvo = Math.round(Number(str(f, 'target', 6)));
  const [lo, hi] = FAIXA[kind];
  if (!Number.isFinite(alvo) || alvo < lo || alvo > hi) return volta(`Alvo inválido: use um número entre ${lo} e ${hi}`);
  const fim = str(f, 'ends_on', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fim) || Number.isNaN(Date.parse(fim))) return volta('Escolha a data final');
  const s = sql();
  const [{ hoje, n }] = await rows(s`select to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as hoje,
    (select count(*)::int from goals where student_id = ${st.id} and by_student) as n`);
  if (fim < hoje) return volta('A data final já passou');
  if (n >= MAX) return volta(`Você já tem ${MAX} metas pessoais. Apague uma para criar outra.`);
  const ate = fim.split('-').reverse().slice(0, 2).join('/');
  const titulo = str(f, 'title', 80) || ({
    sessions: `${alvo} treinos até ${ate}`,
    diet_days: `${alvo} dias de dieta completa até ${ate}`,
    water_days: `${alvo} dias de água em dia até ${ate}`,
  })[kind];
  await s`insert into goals (student_id, kind, title, target, starts_on, ends_on, by_student)
    values (${st.id}, ${kind}, ${titulo}, ${alvo}, (now() at time zone 'America/Sao_Paulo')::date, ${fim}, true)`;
  volta('Meta criada. Bora!');
}

/** O aluno apaga uma meta pessoal (as do professor ele não mexe). */
export async function apagarMetaPessoal(f: FormData) {
  const st = await getStudent();
  if (!st) redirect('/login');
  await sql()`delete from goals where id = ${Number(f.get('id')) | 0} and student_id = ${st.id} and by_student`;
  volta('Meta apagada');
}
