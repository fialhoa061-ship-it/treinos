'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { rows, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { newCode } from '@/lib/util';

const str = (f: FormData, k: string, max = 255) => String(f.get(k) ?? '').trim().slice(0, max);
const int = (f: FormData, k: string) => Number(f.get(k) ?? 0) | 0;
const num = (f: FormData, k: string): number | null => {
  const v = str(f, k).replace(',', '.');
  return v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
};
const url = (f: FormData) => (/^https?:\/\//i.test(str(f, 'video_url', 500)) ? str(f, 'video_url', 500) : null);
const back = (to: string, msg = ''): never => redirect(msg ? `${to}${to.includes('?') ? '&' : '?'}m=${encodeURIComponent(msg)}` : to);
const student = (id: number | string, msg = '') => back(`/admin/alunos/${id}`, msg);

// aluno/treino só valem se forem do professor logado
const mine = async (uid: number, sid: number) => (await rows(sql()`select 1 from students where id=${sid} and owner_id=${uid}`)).length > 0;

// código de 6 dígitos ainda não usado por outro aluno (o código sozinho identifica o aluno)
async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const c = newCode();
    if (!(await rows(sql()`select 1 from students where access_code = ${c}`)).length) return c;
  }
  throw new Error('Sem código livre');
}

// ---- alunos ----
export async function saveStudent(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), name = str(f, 'name', 120);
  const fail = (msg: string) => (id ? student(id, msg) : back('/admin/novo', msg));
  if (!name) return fail('Nome obrigatório');

  // valores fora da faixa estouram as colunas numeric/int do banco e derrubam a página
  const weight = num(f, 'weight_kg');
  if (weight !== null && !(weight > 0 && weight <= 500)) return fail('Peso inválido: use quilos, ex. 68,5');
  let height = num(f, 'height_m');
  if (height !== null && height > 3) height /= 100; // digitado em centímetros (ex. 165)
  if (height !== null && !(height >= 0.5 && height <= 2.5)) return fail('Altura inválida: use metros, ex. 1,65');
  if (height !== null) height = Math.round(height * 100) / 100;
  const ageN = num(f, 'age');
  const age = ageN === null ? null : Math.trunc(ageN);
  if (age !== null && !(age >= 1 && age <= 120)) return fail('Idade inválida');

  const s = sql();
  let sid = id;
  if (id) {
    if (!(await mine(uid, id))) return back('/admin/alunos', 'Aluno não encontrado');
    await s`update students set name=${name}, weight_kg=${weight}, height_m=${height}, age=${age}, goal=${str(f, 'goal', 2000)}, notes=${str(f, 'notes', 4000)} where id=${id} and owner_id=${uid}`;
  } else {
    [{ id: sid }] = await rows(s`insert into students (name, weight_kg, height_m, age, goal, notes, access_code, owner_id)
      values (${name}, ${weight}, ${height}, ${age}, ${str(f, 'goal', 2000)}, ${str(f, 'notes', 4000)}, ${await uniqueCode()}, ${uid}) returning id`);
  }
  student(sid, 'Salvo');
}

export async function deleteStudent(f: FormData) {
  const uid = await requireAdmin();
  await sql()`delete from students where id=${int(f, 'id')} and owner_id=${uid}`;
  back('/admin/alunos', 'Aluno removido');
}

export async function newAccessCode(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id');
  await sql()`update students set access_code=${await uniqueCode()} where id=${id} and owner_id=${uid}`;
  student(id, 'Novo código gerado; o antigo não funciona mais');
}

// ---- validade da ficha ----
export async function savePlanUntil(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), v = str(f, 'plan_until', 10);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  await sql()`update students set plan_until=${ok ? v : null} where id=${id} and owner_id=${uid}`;
  student(id, ok ? 'Data de troca salva' : 'Data de troca removida');
}

// ---- avaliação física ----
// faixas plausíveis: fora delas o valor é ignorado (evita estourar as colunas numeric)
const medida = (f: FormData, k: string, max: number) => { const v = num(f, k); return v !== null && v > 0 && v <= max ? Math.round(v * 10) / 10 : null; };

export async function saveAssessment(f: FormData) {
  const uid = await requireAdmin();
  const sid = int(f, 'student_id');
  if (!(await mine(uid, sid))) return back('/admin/alunos', 'Aluno não encontrado');
  const d = str(f, 'measured_on', 10);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) ? d : null;
  const m = {
    weight: medida(f, 'weight_kg', 500), fat: medida(f, 'body_fat', 80), waist: medida(f, 'waist_cm', 300), hip: medida(f, 'hip_cm', 300),
    chest: medida(f, 'chest_cm', 300), arm: medida(f, 'arm_cm', 150), thigh: medida(f, 'thigh_cm', 200),
  };
  if (Object.values(m).every(v => v === null)) return student(sid, 'Preencha ao menos uma medida');
  const s = sql();
  await s`insert into assessments (student_id, measured_on, weight_kg, body_fat, waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, notes)
    values (${sid}, coalesce(${day}::date, current_date), ${m.weight}, ${m.fat}, ${m.waist}, ${m.hip}, ${m.chest}, ${m.arm}, ${m.thigh}, ${str(f, 'notes', 1000) || null})`;
  // o peso da avaliação mais recente vira o peso do aluno (e o IMC acompanha)
  await s`update students set weight_kg = (select weight_kg from assessments where student_id=${sid} and weight_kg is not null order by measured_on desc, id desc limit 1)
    where id=${sid} and exists (select 1 from assessments where student_id=${sid} and weight_kg is not null)`;
  student(sid, 'Avaliação salva');
}

export async function deleteAssessment(f: FormData) {
  const uid = await requireAdmin();
  const sid = int(f, 'student_id');
  if (!(await mine(uid, sid))) return back('/admin/alunos', 'Aluno não encontrado');
  await sql()`delete from assessments where id=${int(f, 'id')} and student_id=${sid}`;
  student(sid, 'Avaliação removida');
}

// ---- treinos ----
export async function saveWorkout(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), sid = int(f, 'student_id'), name = str(f, 'name', 20);
  if (!(await mine(uid, sid))) return back('/admin/alunos', 'Aluno não encontrado');
  if (!name) return student(sid, 'Nome do treino obrigatório');
  const s = sql();
  if (id) await s`update workouts set name=${name}, focus=${str(f, 'focus', 120)} where id=${id} and student_id=${sid}`;
  else await s`insert into workouts (student_id, name, focus, position)
    values (${sid}, ${name}, ${str(f, 'focus', 120)}, (select coalesce(max(position),0)+1 from workouts where student_id=${sid}))`;
  student(sid, 'Treino salvo');
}

export async function deleteWorkout(f: FormData) {
  const uid = await requireAdmin();
  const sid = int(f, 'student_id');
  if (!(await mine(uid, sid))) return back('/admin/alunos', 'Aluno não encontrado');
  await sql()`delete from workouts where id=${int(f, 'id')} and student_id=${sid}`;
  student(sid, 'Treino removido');
}

export async function moveWorkout(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), sid = int(f, 'student_id'), d = int(f, 'dir') < 0 ? -1 : 1;
  if (!(await mine(uid, sid))) return back('/admin/alunos', 'Aluno não encontrado');
  // renumera 1..n e troca o alvo com o vizinho
  await sql()`
    with ord as (select id, row_number() over (order by position, id) rn from workouts where student_id=${sid}),
         t as (select rn from ord where id=${id})
    update workouts w set position = case when o.id=${id} then (select rn from t)+${d} when o.rn=(select rn from t)+${d} then (select rn from t) else o.rn end
    from ord o where w.id=o.id`;
  student(sid);
}

export async function duplicateWorkout(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), to = int(f, 'to_student');
  const s = sql();
  // origem e destino precisam ser do professor logado
  const [ok] = await rows(s`select 1 as ok from workouts w join students a on a.id = w.student_id, students b
    where w.id=${id} and b.id=${to} and a.owner_id=${uid} and b.owner_id=${uid}`);
  if (!ok) return back('/admin/alunos', 'Destino inválido');
  await s`
    with nw as (insert into workouts (student_id, name, focus, position)
      select ${to}, name, focus, (select coalesce(max(position),0)+1 from workouts where student_id=${to}) from workouts where id=${id} returning id)
    insert into workout_exercises (workout_id, name, sets, reps, rest, notes, video_url, position)
    select nw.id, e.name, e.sets, e.reps, e.rest, e.notes, e.video_url, e.position from nw, workout_exercises e where e.workout_id=${id}`;
  student(to, 'Treino duplicado');
}

// ---- exercícios ----
// aluno dono do treino; se não for do professor logado, volta para a lista
async function ownerOf(uid: number, wid: number): Promise<number> {
  const [r] = await rows(sql()`select w.student_id from workouts w join students s on s.id = w.student_id where w.id=${wid} and s.owner_id=${uid}`);
  if (!r) return back('/admin/alunos', 'Treino não encontrado');
  return r.student_id as number;
}

export async function saveExercise(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), wid = int(f, 'workout_id'), sid = await ownerOf(uid, wid), name = str(f, 'name', 150);
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
  const uid = await requireAdmin();
  const wid = int(f, 'workout_id'), sid = await ownerOf(uid, wid);
  await sql()`delete from workout_exercises where id=${int(f, 'id')} and workout_id=${wid}`;
  student(sid, 'Exercício removido');
}

export async function moveExercise(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), wid = int(f, 'workout_id'), d = int(f, 'dir') < 0 ? -1 : 1, sid = await ownerOf(uid, wid);
  await sql()`
    with ord as (select id, row_number() over (order by position, id) rn from workout_exercises where workout_id=${wid}),
         t as (select rn from ord where id=${id})
    update workout_exercises w set position = case when o.id=${id} then (select rn from t)+${d} when o.rn=(select rn from t)+${d} then (select rn from t) else o.rn end
    from ord o where w.id=o.id`;
  student(sid);
}

// ---- biblioteca ----
export async function saveLibrary(f: FormData) {
  await requireAdmin();
  const id = int(f, 'id'), name = str(f, 'name', 150);
  if (!name) return back('/admin/biblioteca', 'Nome obrigatório');
  const s = sql(), cat = str(f, 'category', 60) || null;
  try {
    if (id) await s`update exercise_library set name=${name}, video_url=${url(f)}, notes=${str(f, 'notes', 2000) || null}, category=${cat} where id=${id}`;
    else await s`insert into exercise_library (name, video_url, notes, category) values (${name}, ${url(f)}, ${str(f, 'notes', 2000) || null}, ${cat})`;
  } catch { return back('/admin/biblioteca', 'Já existe exercício com esse nome'); }
  back('/admin/biblioteca', 'Salvo');
}

export async function deleteLibrary(f: FormData) {
  await requireAdmin();
  await sql()`delete from exercise_library where id=${int(f, 'id')}`;
  back('/admin/biblioteca', 'Removido');
}

// ---- backup ----
// Importar substitui só os alunos do professor logado (a biblioteca é compartilhada e não é tocada).
// Tudo que vem do arquivo é filtrado para os alunos do próprio arquivo e entra com o dono forçado.
export async function importBackup(f: FormData) {
  const uid = await requireAdmin();
  const file = f.get('file');
  let j: Record<string, unknown>;
  try { j = JSON.parse(await (file as File).text()); } catch { return back('/admin/backup', 'Arquivo inválido'); }
  if (j?.app !== 'treinos-backup') return back('/admin/backup', 'Arquivo inválido');

  type R = Record<string, unknown>;
  const list = (t: string): R[] => (Array.isArray(j[t]) ? (j[t] as R[]) : []);
  const students: R[] = list('students').map(r => ({ ...r, owner_id: uid }));
  const sids = new Set(students.map(r => r.id));
  const assessments = list('assessments').filter(r => sids.has(r.student_id));
  const workouts = list('workouts').filter(r => sids.has(r.student_id));
  const wids = new Set(workouts.map(r => r.id));
  const exercises = list('workout_exercises').filter(r => wids.has(r.workout_id));
  const eids = new Set(exercises.map(r => r.id));
  const sessions = list('sessions').filter(r => sids.has(r.student_id) && wids.has(r.workout_id));
  const ses = new Set(sessions.map(r => r.id));
  const logs = list('set_logs').filter(r => ses.has(r.session_id) && eids.has(r.workout_exercise_id));

  const s = sql();
  const put = (t: string, data: R[]) => s.query(`insert into ${t} select * from jsonb_populate_recordset(null::${t}, $1::jsonb)`, [JSON.stringify(data)]);
  const seq = (t: string) => s.query(`select setval(pg_get_serial_sequence('${t}','id'), greatest((select coalesce(max(id), 1) from ${t}), 1), true)`);
  try {
    await s.transaction([
      s.query('delete from students where owner_id = $1', [uid]), // o cascade leva treinos, sessões, cargas e avaliações
      put('students', students), put('assessments', assessments), put('workouts', workouts),
      put('workout_exercises', exercises), put('sessions', sessions), put('set_logs', logs),
      ...['students', 'assessments', 'workouts', 'workout_exercises', 'sessions', 'set_logs'].map(seq),
    ]);
  } catch { return back('/admin/backup', 'Falha ao importar: nada foi alterado'); }
  revalidatePath('/admin', 'layout');
  back('/admin/backup', 'Backup importado');
}
