'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { rows, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { newToken } from '@/lib/util';

const str = (f: FormData, k: string, max = 255) => String(f.get(k) ?? '').trim().slice(0, max);
const int = (f: FormData, k: string) => Number(f.get(k) ?? 0) | 0;
const num = (f: FormData, k: string): number | null => {
  const v = str(f, k).replace(',', '.');
  return v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
};
const url = (f: FormData) => (/^https?:\/\//i.test(str(f, 'video_url', 500)) ? str(f, 'video_url', 500) : null);
const back = (to: string, msg = ''): never => redirect(msg ? `${to}${to.includes('?') ? '&' : '?'}m=${encodeURIComponent(msg)}` : to);
const student = (id: number | string, msg = '') => back(`/admin/alunos/${id}`, msg);

// ---- alunos ----
export async function saveStudent(f: FormData) {
  await requireAdmin();
  const id = int(f, 'id'), name = str(f, 'name', 120);
  if (!name) return back('/admin', 'Nome obrigatório');
  const age = num(f, 'age') === null ? null : Math.trunc(num(f, 'age')!);
  const s = sql();
  let sid = id;
  if (id) {
    await s`update students set name=${name}, weight_kg=${num(f, 'weight_kg')}, height_m=${num(f, 'height_m')}, age=${age}, goal=${str(f, 'goal', 2000)}, notes=${str(f, 'notes', 4000)} where id=${id}`;
  } else {
    [{ id: sid }] = await rows(s`insert into students (name, weight_kg, height_m, age, goal, notes, token)
      values (${name}, ${num(f, 'weight_kg')}, ${num(f, 'height_m')}, ${age}, ${str(f, 'goal', 2000)}, ${str(f, 'notes', 4000)}, ${newToken()}) returning id`);
  }
  student(sid, 'Salvo');
}

export async function deleteStudent(f: FormData) {
  await requireAdmin();
  await sql()`delete from students where id=${int(f, 'id')}`;
  back('/admin', 'Aluno removido');
}

export async function newLink(f: FormData) {
  await requireAdmin();
  const id = int(f, 'id');
  await sql()`update students set token=${newToken()} where id=${id}`;
  student(id, 'Novo link gerado; o antigo não funciona mais');
}

// ---- treinos ----
export async function saveWorkout(f: FormData) {
  await requireAdmin();
  const id = int(f, 'id'), sid = int(f, 'student_id'), name = str(f, 'name', 20);
  if (!name) return student(sid, 'Nome do treino obrigatório');
  const s = sql();
  if (id) await s`update workouts set name=${name}, focus=${str(f, 'focus', 120)} where id=${id} and student_id=${sid}`;
  else await s`insert into workouts (student_id, name, focus, position)
    values (${sid}, ${name}, ${str(f, 'focus', 120)}, (select coalesce(max(position),0)+1 from workouts where student_id=${sid}))`;
  student(sid, 'Treino salvo');
}

export async function deleteWorkout(f: FormData) {
  await requireAdmin();
  const sid = int(f, 'student_id');
  await sql()`delete from workouts where id=${int(f, 'id')} and student_id=${sid}`;
  student(sid, 'Treino removido');
}

export async function moveWorkout(f: FormData) {
  await requireAdmin();
  const id = int(f, 'id'), sid = int(f, 'student_id'), d = int(f, 'dir') < 0 ? -1 : 1;
  // renumera 1..n e troca o alvo com o vizinho
  await sql()`
    with ord as (select id, row_number() over (order by position, id) rn from workouts where student_id=${sid}),
         t as (select rn from ord where id=${id})
    update workouts w set position = case when o.id=${id} then (select rn from t)+${d} when o.rn=(select rn from t)+${d} then (select rn from t) else o.rn end
    from ord o where w.id=o.id`;
  student(sid);
}

export async function duplicateWorkout(f: FormData) {
  await requireAdmin();
  const id = int(f, 'id'), to = int(f, 'to_student');
  const s = sql();
  const [ok] = await rows(s`select 1 as ok from workouts w, students st where w.id=${id} and st.id=${to}`);
  if (!ok) return back('/admin', 'Destino inválido');
  await s`
    with nw as (insert into workouts (student_id, name, focus, position)
      select ${to}, name, focus, (select coalesce(max(position),0)+1 from workouts where student_id=${to}) from workouts where id=${id} returning id)
    insert into workout_exercises (workout_id, name, sets, reps, rest, notes, video_url, position)
    select nw.id, e.name, e.sets, e.reps, e.rest, e.notes, e.video_url, e.position from nw, workout_exercises e where e.workout_id=${id}`;
  student(to, 'Treino duplicado');
}

// ---- exercícios ----
async function ownerOf(wid: number) {
  const [r] = await rows(sql()`select student_id from workouts where id=${wid}`);
  return r?.student_id as number;
}

export async function saveExercise(f: FormData) {
  await requireAdmin();
  const id = int(f, 'id'), wid = int(f, 'workout_id'), sid = await ownerOf(wid), name = str(f, 'name', 150);
  if (!name) return student(sid, 'Nome do exercício obrigatório');
  const sets = Math.max(1, Math.min(20, int(f, 'sets') || 3));
  const reps = str(f, 'reps', 40) || '10', rest = str(f, 'rest', 40) || '90 s', notes = str(f, 'notes', 2000) || null;
  const s = sql();
  if (id) await s`update workout_exercises set name=${name}, sets=${sets}, reps=${reps}, rest=${rest}, notes=${notes}, video_url=${url(f)} where id=${id} and workout_id=${wid}`;
  else await s`insert into workout_exercises (workout_id, name, sets, reps, rest, notes, video_url, position)
    values (${wid}, ${name}, ${sets}, ${reps}, ${rest}, ${notes}, ${url(f)}, (select coalesce(max(position),0)+1 from workout_exercises where workout_id=${wid}))`;
  student(sid, 'Exercício salvo');
}

export async function deleteExercise(f: FormData) {
  await requireAdmin();
  const wid = int(f, 'workout_id');
  await sql()`delete from workout_exercises where id=${int(f, 'id')} and workout_id=${wid}`;
  student(await ownerOf(wid), 'Exercício removido');
}

export async function moveExercise(f: FormData) {
  await requireAdmin();
  const id = int(f, 'id'), wid = int(f, 'workout_id'), d = int(f, 'dir') < 0 ? -1 : 1;
  await sql()`
    with ord as (select id, row_number() over (order by position, id) rn from workout_exercises where workout_id=${wid}),
         t as (select rn from ord where id=${id})
    update workout_exercises w set position = case when o.id=${id} then (select rn from t)+${d} when o.rn=(select rn from t)+${d} then (select rn from t) else o.rn end
    from ord o where w.id=o.id`;
  student(await ownerOf(wid));
}

// ---- biblioteca ----
export async function saveLibrary(f: FormData) {
  await requireAdmin();
  const id = int(f, 'id'), name = str(f, 'name', 150);
  if (!name) return back('/admin/biblioteca', 'Nome obrigatório');
  const s = sql();
  try {
    if (id) await s`update exercise_library set name=${name}, video_url=${url(f)}, notes=${str(f, 'notes', 2000) || null} where id=${id}`;
    else await s`insert into exercise_library (name, video_url, notes) values (${name}, ${url(f)}, ${str(f, 'notes', 2000) || null})`;
  } catch { return back('/admin/biblioteca', 'Já existe exercício com esse nome'); }
  back('/admin/biblioteca', 'Salvo');
}

export async function deleteLibrary(f: FormData) {
  await requireAdmin();
  await sql()`delete from exercise_library where id=${int(f, 'id')}`;
  back('/admin/biblioteca', 'Removido');
}

// ---- backup ----
const TABLES = ['exercise_library', 'students', 'workouts', 'workout_exercises', 'sessions', 'set_logs'] as const;

export async function importBackup(f: FormData) {
  await requireAdmin();
  const file = f.get('file');
  let j: Record<string, unknown>;
  try { j = JSON.parse(await (file as File).text()); } catch { return back('/admin/backup', 'Arquivo inválido'); }
  if (j?.app !== 'treinos-backup') return back('/admin/backup', 'Arquivo inválido');

  const s = sql();
  try {
    await s.transaction([
      ...[...TABLES].reverse().map(t => s.query(`delete from ${t}`)),
      ...TABLES.map(t => s.query(`insert into ${t} select * from jsonb_populate_recordset(null::${t}, $1::jsonb)`, [JSON.stringify(Array.isArray(j[t]) ? j[t] : [])])),
      ...TABLES.map(t => s.query(`select setval(pg_get_serial_sequence('${t}','id'), coalesce((select max(id) from ${t}), 1), (select count(*) > 0 from ${t}))`)),
    ]);
  } catch { return back('/admin/backup', 'Falha ao importar: nada foi alterado'); }
  revalidatePath('/admin', 'layout');
  back('/admin/backup', 'Backup importado');
}
