import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { getStudent } from '@/lib/auth';
import Aluno from './Aluno';

export const metadata = { title: 'Meu treino', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function TreinoPage() {
  const st = await getStudent();
  if (!st) redirect('/login');
  const s = sql();

  const workouts = await rows(s`
    select w.id, w.name, w.focus,
      coalesce((select json_agg(json_build_object('id', e.id, 'name', e.name, 'sets', e.sets, 'reps', e.reps, 'rest', e.rest, 'notes', e.notes, 'video_url', e.video_url) order by e.position, e.id)
        from workout_exercises e where e.workout_id = w.id), '[]') as exercises
    from workouts w where w.student_id = ${st.id} order by w.position, w.id`);

  // última sessão de cada exercício
  const logs = await rows(s`
    select distinct on (sl.workout_exercise_id, sl.set_number)
      sl.workout_exercise_id as we, sl.set_number as n, sl.weight_kg as w, sl.reps as r
    from set_logs sl join sessions se on se.id = sl.session_id
    where se.student_id = ${st.id}
      and se.id = (select se2.id from set_logs s2 join sessions se2 on se2.id = s2.session_id
                   where s2.workout_exercise_id = sl.workout_exercise_id and se2.student_id = ${st.id}
                   order by se2.finished_at desc, se2.id desc limit 1)
    order by sl.workout_exercise_id, sl.set_number`);
  const last: Record<string, { n: number; w: number | null; r: number | null }[]> = {};
  for (const l of logs) (last[l.we] ??= []).push({ n: l.n, w: l.w === null ? null : Number(l.w), r: l.r });

  const [lw] = await rows(s`select workout_id from sessions where student_id = ${st.id} order by finished_at desc, id desc limit 1`);

  // calendário: dia (horário de Brasília) e treino de cada sessão
  const [days, [{ today }]] = await Promise.all([
    rows(s`
      select to_char(se.finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as d, w.name as w, w.focus
      from sessions se join workouts w on w.id = se.workout_id
      where se.student_id = ${st.id} order by se.finished_at`),
    rows(s`select to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as today`),
  ]);

  return <div className="app"><Aluno sid={st.id} name={st.name} notes={st.notes} workouts={workouts as never} last={last} lastWorkoutId={lw?.workout_id ?? null}
    sessions={days as never} today={today} /></div>;
}
