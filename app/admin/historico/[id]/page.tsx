import Link from 'next/link';
import { notFound } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { Chart } from '../../Client';

export default async function Historico({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
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
      <h1>Histórico — {st.name}</h1>
      <p><Link href={`/admin/alunos/${id}`}>← voltar</Link></p>
      {!by.size && <p className="muted">Nenhuma sessão registrada ainda.</p>}
      {[...by].map(([ex, days]) => {
        const pts = [...days].map(([d, sets]) => [d, Math.max(...sets.map(x => Number(x.w) || 0))] as [string, number]);
        return (
          <div className="card" key={ex}>
            <h2>{ex}</h2>
            <Chart pts={pts} />
            <table>
              <thead><tr><th>Data</th><th>Séries (kg × reps)</th></tr></thead>
              <tbody>
                {[...days].reverse().map(([d, sets]) => (
                  <tr key={d}>
                    <td>{d.split('-').reverse().join('/')}</td>
                    <td>{sets.map(x => `${Number(x.w ?? 0)} × ${x.r ?? '-'}`).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
