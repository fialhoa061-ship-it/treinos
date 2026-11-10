import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { getStudent } from '@/lib/auth';
import { TERMO_VERSAO } from '@/lib/util';
import Aluno from './Aluno';
import Termo from './Termo';
import Encerrado, { type Ganho } from './Encerrado';

export const metadata = { title: 'Meu treino', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function TreinoPage({ searchParams }: { searchParams: Promise<{ m?: string; continuar?: string }> }) {
  const st = await getStudent();
  if (!st) redirect('/login');
  const s = sql();
  const { m, continuar } = await searchParams;

  // LGPD: sem o termo aceito (ou com versão antiga), mostra o termo antes do treino
  const [lg] = await rows(s`select age, consent_version, delete_requested_at, to_char(plan_until, 'YYYY-MM-DD') as plan,
    to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as hoje from students where id = ${st.id}`);
  if ((lg?.consent_version ?? 0) < TERMO_VERSAO) {
    return <div className="app"><Termo nome={st.name} menor={lg?.age != null && lg.age < 18} idadeConhecida={lg?.age != null} /></div>;
  }

  // validade da ficha: passou da data do professor → "ficha concluída" (o aluno pode repetir a ficha atual)
  const vencida: string | null = lg?.plan && lg.plan < lg.hoje ? lg.plan : null;
  if (vencida && continuar !== '1') {
    const [[resumo], ganhos] = await Promise.all([
      rows(s`select count(*)::int as treinos, to_char(min(finished_at) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as inicio
        from sessions where student_id = ${st.id}`),
      // maior carga de cada exercício por treino; ganho = melhor marca menos a primeira
      rows(s`with d as (
          select e.name as ex, se.finished_at, max(sl.weight_kg)::float as w
          from set_logs sl join sessions se on se.id = sl.session_id join workout_exercises e on e.id = sl.workout_exercise_id
          where se.student_id = ${st.id} and sl.weight_kg > 0 group by e.name, se.id, se.finished_at)
        select ex, (array_agg(w order by finished_at))[1] as primeiro, max(w) as melhor from d group by ex
        having max(w) > (array_agg(w order by finished_at))[1]
        order by max(w) - (array_agg(w order by finished_at))[1] desc limit 3`),
    ]);
    return <div className="app"><Encerrado nome={st.name} fim={vencida} inicio={resumo?.inicio ?? null} treinos={resumo?.treinos ?? 0} ganhos={ganhos as Ganho[]} /></div>;
  }

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
  const [days, [{ today }], evo, pesos] = await Promise.all([
    rows(s`
      select to_char(se.finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as d, w.name as w, w.focus
      from sessions se join workouts w on w.id = se.workout_id
      where se.student_id = ${st.id} order by se.finished_at`),
    rows(s`select to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as today`),
    // minha evolução: maior carga de cada exercício por dia de treino
    rows(s`
      select e.name as ex, to_char(se.finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as d, max(sl.weight_kg)::float as w
      from set_logs sl join sessions se on se.id = sl.session_id join workout_exercises e on e.id = sl.workout_exercise_id
      where se.student_id = ${st.id} and sl.weight_kg > 0
      group by 1, 2 order by 1, 2`),
    rows(s`select to_char(measured_on, 'YYYY-MM-DD') as d, weight_kg::float as w from assessments
      where student_id = ${st.id} and weight_kg is not null order by measured_on, id`),
  ]);

  return <div className="app"><Aluno sid={st.id} name={st.name} notes={st.notes} workouts={workouts as never} last={last} lastWorkoutId={lw?.workout_id ?? null}
    sessions={days as never} today={today} evo={evo as never} pesos={pesos as never}
    exclusaoPedida={!!lg?.delete_requested_at || m === 'exclusao'} fichaVencida={vencida} /></div>;
}
