'use server';

import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const str = (f: FormData, k: string, max = 255) => String(f.get(k) ?? '').trim().slice(0, max);
const int = (f: FormData, k: string) => Number(f.get(k) ?? 0) | 0;
const go = (to: string, msg: string): never => redirect(`${to}${to.includes('?') ? '&' : '?'}m=${encodeURIComponent(msg)}`);

/** Salva a ficha atual do aluno (treinos e exercícios, na mesma ordem) como modelo do professor. */
export async function saveAsTemplate(f: FormData) {
  const uid = await requireAdmin();
  const sid = int(f, 'student_id'), name = str(f, 'name', 80);
  const s = sql();
  const [st] = await rows(s`select id from students where id = ${sid} and owner_id = ${uid}`);
  if (!st) return go('/admin/alunos', 'Aluno não encontrado');
  if (!name) return go(`/admin/alunos/${sid}`, 'Dê um nome ao modelo');
  const ws = await rows(s`select id, name, focus from workouts where student_id = ${sid} order by position, id`);
  if (!ws.length) return go(`/admin/alunos/${sid}`, 'Este aluno ainda não tem treinos para virar modelo');
  const [t] = await rows(s`insert into templates (owner_id, name, description) values (${uid}, ${name}, ${str(f, 'description', 300) || null}) returning id`);
  for (const [i, w] of ws.entries()) {
    const [tw] = await rows(s`insert into template_workouts (template_id, name, focus, position) values (${t.id}, ${w.name}, ${w.focus}, ${i + 1}) returning id`);
    await s`insert into template_exercises (template_workout_id, name, sets, reps, rest, notes, video_url, position)
      select ${tw.id}, name, sets, reps, rest, notes, video_url, row_number() over (order by position, id)
      from workout_exercises where workout_id = ${w.id}`;
  }
  go(`/admin/alunos/${sid}`, `Modelo "${name}" salvo`);
}

/** Aplica um modelo (do professor ou pronto) ao aluno: os treinos entram depois dos que ele já tem. */
export async function applyTemplate(f: FormData) {
  const uid = await requireAdmin();
  const sid = int(f, 'student_id'), tid = int(f, 'template_id');
  const s = sql();
  const [ok] = await rows(s`select 1 as ok from students st, templates t
    where st.id = ${sid} and st.owner_id = ${uid} and t.id = ${tid} and (t.owner_id = ${uid} or t.owner_id is null)`);
  if (!ok) return go(`/admin/alunos/${sid}`, 'Modelo não encontrado');
  const tws = await rows(s`select id, name, focus from template_workouts where template_id = ${tid} order by position, id`);
  const [{ p }] = await rows(s`select coalesce(max(position), 0)::int as p from workouts where student_id = ${sid}`);
  for (const [i, tw] of tws.entries()) {
    const [w] = await rows(s`insert into workouts (student_id, name, focus, position) values (${sid}, ${tw.name}, ${tw.focus}, ${p + i + 1}) returning id`);
    await s`insert into workout_exercises (workout_id, name, sets, reps, rest, notes, video_url, position)
      select ${w.id}, name, sets, reps, rest, notes, video_url, position
      from template_exercises where template_workout_id = ${tw.id}`;
  }
  go(`/admin/alunos/${sid}`, 'Modelo aplicado: revise os treinos abaixo');
}

export async function deleteTemplate(f: FormData) {
  const uid = await requireAdmin();
  await sql()`delete from templates where id = ${int(f, 'id')} and owner_id = ${uid}`; // modelos prontos (sem dono) não são apagados
  go('/admin/modelos', 'Modelo excluído');
}

export async function renameTemplate(f: FormData) {
  const uid = await requireAdmin();
  const name = str(f, 'name', 80);
  if (!name) return go('/admin/modelos', 'Dê um nome ao modelo');
  await sql()`update templates set name = ${name}, description = ${str(f, 'description', 300) || null} where id = ${int(f, 'id')} and owner_id = ${uid}`;
  go('/admin/modelos', 'Modelo salvo');
}
