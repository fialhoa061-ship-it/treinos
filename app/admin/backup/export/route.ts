import { isAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TABLES = ['exercise_library', 'students', 'workouts', 'workout_exercises', 'sessions', 'set_logs'];

export async function GET() {
  if (!(await isAdmin())) return new Response('Não autorizado', { status: 401 });
  const s = sql();
  const out: Record<string, unknown> = { app: 'treinos-backup', version: 1, date: new Date().toISOString() };
  for (const t of TABLES) out[t] = await s.query(`select * from ${t} order by id`);
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="backup-treinos-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
