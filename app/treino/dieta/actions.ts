'use server';

import { rows, sql } from '@/lib/db';
import { getStudent } from '@/lib/auth';

/** O aluno marca (ou desmarca) uma refeição feita hoje (dia de Brasília). */
export async function marcarRefeicao(mealId: number, feito: boolean): Promise<{ ok: boolean }> {
  const st = await getStudent();
  if (!st) return { ok: false };
  const s = sql();
  const [m] = await rows(s`select 1 as ok from diet_meals where id = ${Number(mealId)} and student_id = ${st.id}`);
  if (!m) return { ok: false };
  if (feito) {
    await s`insert into diet_checks (student_id, meal_id, day) values (${st.id}, ${Number(mealId)}, (now() at time zone 'America/Sao_Paulo')::date)
      on conflict (meal_id, day) do nothing`;
  } else {
    await s`delete from diet_checks where meal_id = ${Number(mealId)} and day = (now() at time zone 'America/Sao_Paulo')::date`;
  }
  return { ok: true };
}

/** Copos de água bebidos hoje (valor absoluto do dia; a tela envia um de cada vez, então o último toque é o que fica). */
export async function marcarAgua(copos: number): Promise<{ ok: boolean }> {
  const st = await getStudent();
  if (!st) return { ok: false };
  const n = Math.min(30, Math.max(0, Math.round(Number(copos)) || 0));
  await sql()`insert into water_logs (student_id, day, cups) values (${st.id}, (now() at time zone 'America/Sao_Paulo')::date, ${n})
    on conflict (student_id, day) do update set cups = excluded.cups`;
  return { ok: true };
}
