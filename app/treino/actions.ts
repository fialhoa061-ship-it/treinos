'use server';

import { rows, sql } from '@/lib/db';
import { getStudent } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ALERTAS, TERMO_VERSAO } from '@/lib/util';

type Log = { we_id: number; set: number; weight: string; reps: string };
export type Feedback = { effort?: number | null; alerts?: string[]; comment?: string };
export type Payload = { workout_id: number; logs: Log[]; at?: string; feedback?: Feedback };

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

  // retorno do aluno: esforço 0–10, sintomas conhecidos e comentário curto (tudo opcional)
  const fb = p.feedback ?? {};
  const effort = Number.isInteger(fb.effort) && fb.effort! >= 0 && fb.effort! <= 10 ? fb.effort! : null;
  const alerts = [...new Set((Array.isArray(fb.alerts) ? fb.alerts : []).filter(a => a in ALERTAS))];
  const comment = String(fb.comment ?? '').trim().slice(0, 500) || null;

  await s`
    with ses as (insert into sessions (student_id, workout_id, finished_at, effort, alerts, comment)
      values (${st.id}, ${Number(p.workout_id)}, ${when}, ${effort}, ${alerts.length ? alerts : null}, ${comment}) returning id)
    insert into set_logs (session_id, workout_exercise_id, set_number, weight_kg, reps)
    select ses.id, x.we, x.n, x.w, x.r from ses, jsonb_to_recordset(${JSON.stringify([...seen.values()])}::jsonb) as x(we int, n int, w numeric, r int)`;
  return { ok: true };
}

// ---- LGPD (aluno) ----
/** Aceite do termo. Menor de 18 anos: exige o nome do responsável e a declaração dele. */
export async function acceptConsent(_prev: string, f: FormData): Promise<string> {
  const st = await getStudent();
  if (!st) redirect('/login');
  const s = sql();
  const [a] = await rows(s`select age from students where id = ${st.id}`);
  const menor = (a?.age != null && a.age < 18) || f.get('menor') === '1';
  if (f.get('aceite') !== '1') return 'Para continuar, marque que leu e concorda com o termo.';
  const resp = String(f.get('responsavel') ?? '').trim().slice(0, 120);
  if (menor && (resp.length < 3 || f.get('aceite_resp') !== '1')) return 'Menores de 18 anos precisam do nome e da autorização do responsável.';
  await s`update students set consent_at = now(), consent_version = ${TERMO_VERSAO}, consent_guardian = ${menor ? resp : null} where id = ${st.id}`;
  redirect('/treino');
}

/** O aluno pede para apagar os dados. O professor recebe o pedido no painel e faz a exclusão. */
export async function requestDeletion() {
  const st = await getStudent();
  if (!st) redirect('/login');
  await sql()`update students set delete_requested_at = coalesce(delete_requested_at, now()) where id = ${st.id}`;
  redirect('/treino?m=exclusao');
}
