import { adminId } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await adminId();
  if (!uid) return new Response('Não autorizado', { status: 401 });
  const s = sql();
  // só os alunos do professor logado e tudo que pertence a eles
  const out: Record<string, unknown> = {
    app: 'treinos-backup', version: 1, date: new Date().toISOString(),
    exercise_library: await s`select * from exercise_library order by id`,
    students: await s`select * from students where owner_id = ${uid} order by id`,
    assessments: await s`select a.* from assessments a join students st on st.id = a.student_id where st.owner_id = ${uid} order by a.id`,
    workouts: await s`select w.* from workouts w join students st on st.id = w.student_id where st.owner_id = ${uid} order by w.id`,
    workout_exercises: await s`select e.* from workout_exercises e join workouts w on w.id = e.workout_id join students st on st.id = w.student_id where st.owner_id = ${uid} order by e.id`,
    sessions: await s`select se.* from sessions se join students st on st.id = se.student_id where st.owner_id = ${uid} order by se.id`,
    set_logs: await s`select l.* from set_logs l join sessions se on se.id = l.session_id join students st on st.id = se.student_id where st.owner_id = ${uid} order by l.id`,
  };
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="backup-treinos-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
