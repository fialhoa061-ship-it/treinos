import Link from 'next/link';
import { notFound } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { imc } from '@/lib/util';
import { Act } from '../../ui';
import { AccessCode, ExerciseForm } from '../../Client';
import { deleteExercise, deleteStudent, deleteWorkout, duplicateWorkout, moveExercise, moveWorkout, newAccessCode, saveExercise, saveStudent, saveWorkout } from '../../actions';

export default async function Aluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const { id: raw } = await params;
  const { m } = await searchParams;
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();
  const s = sql();
  const [st] = await rows(s`select * from students where id=${id}`);
  if (!st) notFound();

  const [workouts, exercises, others, library] = await Promise.all([
    rows(s`select * from workouts where student_id=${id} order by position, id`),
    rows(s`select e.* from workout_exercises e join workouts w on w.id=e.workout_id where w.student_id=${id} order by e.position, e.id`),
    rows(s`select id, name from students where id<>${id} order by name`),
    rows(s`select name, video_url, notes from exercise_library order by name`),
  ]);
  const bmi = imc(st.weight_kg, st.height_m);

  return (
    <>
      {m && <p className="flash">{m}</p>}
      <h1>{st.name} {bmi && <small>IMC {bmi}</small>}</h1>

      <div className="card">
        <AccessCode code={st.access_code} name={st.name} />
        <div className="row" style={{ marginTop: 8 }}>
          <Act action={newAccessCode} fields={{ id }} label="Gerar novo código" confirm="O código antigo deixará de funcionar e o aluno será desconectado. Continuar?" />
          <Link className="btn" href={`/admin/historico/${id}`}>Histórico de cargas</Link>
        </div>
      </div>

      <form action={saveStudent} className="card">
        <input type="hidden" name="id" value={id} />
        <div className="row">
          <label>Nome <input name="name" required defaultValue={st.name} /></label>
          <label>Peso (kg) <input name="weight_kg" inputMode="decimal" defaultValue={st.weight_kg ?? ''} /></label>
          <label>Altura (m) <input name="height_m" inputMode="decimal" defaultValue={st.height_m ?? ''} /></label>
          <label>Idade <input name="age" inputMode="numeric" defaultValue={st.age ?? ''} /></label>
        </div>
        <label>Objetivo <textarea name="goal" rows={2} defaultValue={st.goal ?? ''} /></label>
        <label>Observações / limitações <textarea name="notes" rows={4} defaultValue={st.notes ?? ''} /></label>
        <button>Salvar aluno</button>
      </form>

      <h2>Treinos</h2>
      {workouts.map(w => (
        <div className="card" key={w.id}>
          <form action={saveWorkout} className="row">
            <input type="hidden" name="id" value={w.id} /><input type="hidden" name="student_id" value={id} />
            <label>Treino <input name="name" required defaultValue={w.name} /></label>
            <label>Foco <input name="focus" defaultValue={w.focus ?? ''} /></label>
            <button>Salvar</button>
          </form>
          <div className="row" style={{ margin: '8px 0' }}>
            <Act action={moveWorkout} fields={{ id: w.id, student_id: id, dir: -1 }} label="↑" />
            <Act action={moveWorkout} fields={{ id: w.id, student_id: id, dir: 1 }} label="↓" />
            <Act action={deleteWorkout} fields={{ id: w.id, student_id: id }} label="Excluir treino" cls="danger" confirm="Excluir treino e seu histórico?" />
            {others.length > 0 && (
              <form action={duplicateWorkout} className="inline row">
                <input type="hidden" name="id" value={w.id} />
                <select name="to_student" aria-label="Duplicar para">{others.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
                <button>Duplicar para…</button>
              </form>
            )}
          </div>

          {exercises.filter(e => e.workout_id === w.id).map((x, i) => (
            <details className="card" key={x.id}>
              <summary><b>{i + 1}.</b> {x.name} — {x.sets} × {x.reps} · {x.rest}</summary>
              <ExerciseForm action={saveExercise} workoutId={w.id} ex={x} label="Salvar" />
              <div className="row" style={{ marginTop: 8 }}>
                <Act action={moveExercise} fields={{ id: x.id, workout_id: w.id, dir: -1 }} label="↑" />
                <Act action={moveExercise} fields={{ id: x.id, workout_id: w.id, dir: 1 }} label="↓" />
                <Act action={deleteExercise} fields={{ id: x.id, workout_id: w.id }} label="Excluir" cls="danger" confirm="Excluir exercício?" />
              </div>
            </details>
          ))}

          <details>
            <summary>+ Adicionar exercício</summary>
            <ExerciseForm action={saveExercise} workoutId={w.id} library={library as never} label="Adicionar" />
          </details>
        </div>
      ))}

      <form action={saveWorkout} className="card row">
        <input type="hidden" name="student_id" value={id} />
        <label>Novo treino (ex.: E) <input name="name" required /></label>
        <label>Foco <input name="focus" /></label>
        <button>Criar treino</button>
      </form>

      <Act action={deleteStudent} fields={{ id }} label="Excluir aluno" cls="danger" confirm="Excluir aluno e todo o histórico?" />
    </>
  );
}
