'use server';

import { rows, sql } from '@/lib/db';
import { TOKEN_RE } from '@/lib/util';

type Log = { we_id: number; set: number; weight: string; reps: string };
export type Payload = { workout_id: number; logs: Log[]; at?: string };

/** Grava a sessão de um aluno (autenticado só pelo token). Tudo numa única instrução = atômico. */
export async function saveSession(token: string, p: Payload): Promise<{ ok: boolean }> {
  if (!TOKEN_RE.test(token)) return { ok: false };
  const s = sql();
  const [st] = await rows(s`select id from students where token = ${token}`);
  if (!st) return { ok: false };

  const valid = new Set((await rows(s`
    select we.id from workout_exercises we join workouts w on w.id = we.workout_id
    where w.id = ${Number(p.workout_id)} and w.student_id = ${st.id}`)).map(r => r.id));
  if (!valid.size) return { ok: false };

  const seen = new Map<string, { we: number; n: number; w: number | null; r: number | null }>();
  for (const l of p.logs ?? []) {
    const we = Number(l.we_id), n = Number(l.set);
    if (!valid.has(we) || !(n >= 1 && n <= 20)) continue;
    let w = l.weight === '' || l.weight == null ? null : Math.round(Number(l.weight) * 100) / 100;
    let r = l.reps === '' || l.reps == null ? null : Math.trunc(Number(l.reps));
    if (w !== null && !(w >= 0 && w <= 2000)) w = null;
    if (r !== null && !(r >= 0 && r <= 999)) r = null;
    seen.set(`${we}-${n}`, { we, n, w, r });
  }
  if (!seen.size) return { ok: false };

  // data do treino pode vir do celular (envio atrasado); só aceita passado recente
  const at = Date.parse(p.at ?? '');
  const when = at && at <= Date.now() && at > Date.now() - 30 * 86400_000 ? new Date(at).toISOString() : new Date().toISOString();

  await s`
    with ses as (insert into sessions (student_id, workout_id, finished_at) values (${st.id}, ${Number(p.workout_id)}, ${when}) returning id)
    insert into set_logs (session_id, workout_exercise_id, set_number, weight_kg, reps)
    select ses.id, x.we, x.n, x.w, x.r from ses, jsonb_to_recordset(${JSON.stringify([...seen.values()])}::jsonb) as x(we int, n int, w numeric, r int)`;
  return { ok: true };
}
