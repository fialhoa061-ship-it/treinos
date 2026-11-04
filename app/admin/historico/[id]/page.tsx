import { notFound } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import Icon from '../../../Icon';
import { Chart } from '../../Client';
import { Top } from '../../ui';

export default async function Historico({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) notFound();
  const s = sql();
  const [st] = await rows(s`select id, name from students where id=${id}`);
  if (!st) notFound();

  const logs = await rows(s`
    select e.name ex, to_char(se.finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') d, sl.set_number n, sl.weight_kg w, sl.reps r
    from set_logs sl join sessions se on se.id = sl.session_id join workout_exercises e on e.id = sl.workout_exercise_id
    where se.student_id = ${id} order by e.name, se.finished_at, sl.set_number`);

  const by = new Map<string, Map<string, typeof logs>>();
  for (const l of logs) {
    const days = by.get(l.ex) ?? by.set(l.ex, new Map()).get(l.ex)!;
    (days.get(l.d) ?? days.set(l.d, []).get(l.d)!).push(l);
  }

  return (
    <>
      <Top title="Histórico de cargas" sub={st.name} back={`/admin/alunos/${id}`} />
      {!by.size && (
        <div className="panel empty">
          <span className="dot"><Icon name="chart" size={28} /></span>
          <h2>Nenhum treino registrado</h2>
          <p>Quando {st.name} finalizar um treino no celular, a evolução de cada exercício aparece aqui.</p>
        </div>
      )}
      {[...by].map(([ex, days]) => {
        const pts = [...days].map(([d, sets]) => [d, Math.max(...sets.map(x => Number(x.w) || 0))] as [string, number]);
        const first = pts[0][1], last = pts[pts.length - 1][1], diff = Math.round((last - first) * 100) / 100;
        return (
          <section className="panel" key={ex}>
            <div className="panel-h">
              <h2>{ex}</h2>
              {pts.length > 1 && <span className={`tag ${diff > 0 ? 'blue' : ''}`}>{diff > 0 ? '+' : ''}{diff.toLocaleString('pt-BR')} kg</span>}
            </div>
            <p className="big">{last.toLocaleString('pt-BR')}<small> kg na última sessão</small></p>
            <Chart pts={pts} />
            <div className="hist">
              {[...days].reverse().slice(0, 6).map(([d, sets]) => (
                <div key={d}>
                  <span>{d.split('-').reverse().slice(0, 2).join('/')}</span>
                  <b>{sets.map(x => `${Number(x.w ?? 0).toLocaleString('pt-BR')}×${x.r ?? '–'}`).join('  ·  ')}</b>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
