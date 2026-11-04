'use server';

import { rows, sql } from '@/lib/db';
import { getStudent } from '@/lib/auth';

type Log = { we_id: number; set: number; weight: string; reps: string };
export type Payload = { workout_id: number; logs: Log[]; at?: string };

/** Grava a sessão do aluno logado. Tudo numa única instrução = atômico. */
export async function saveSession(p: Payload): Promise<{ ok: boolean; expired?: boolean }> {
  const st = await getStudent();
  if (!st) return { ok: false, expired: true };
  const s = sql();

  const valid = new Set((await rows(s`
    select we.id from workout_exercises we join workouts w on w.id = we.workout_id
    where w.id = ${Number(p.workout_id)} and w.student_id = ${st.id}`)).map(r => r.id));
  if (!valid.size) return { ok: false };

  const seen = new Map<string, { we: number; n: number; w: number | null; r: number | null }>();
  for (const l of p.logs ?? []) {
    const we = Number(l.we_id), n = Number(l.set);
    if (!valid.has(we) || !(n >= 1 && n <= 20)) continue;
    // carga digitada com vírgula ("22,5") virava NaN e era descartada
    const ws = String(l.weight ?? '').trim().replace(',', '.'), rs = String(l.reps ?? '').trim();
    let w = ws === '' ? null : Math.round(Number(ws) * 100) / 100;
    let r = rs === '' ? null : Math.trunc(Number(rs));
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
