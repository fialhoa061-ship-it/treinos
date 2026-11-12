import { rows, sql } from '@/lib/db';
import { exigirAluno } from '@/lib/aluno';
import Icon from '../../Icon';
import Nav from '../Nav';
import Refeicoes, { type Refeicao } from './Refeicoes';

export const metadata = { title: 'Minha dieta', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function DietaPage() {
  const st = await exigirAluno();
  const s = sql();
  const [meals, [d]] = await Promise.all([
    rows(s`select m.id, m.name, m.time_hint,
        exists (select 1 from diet_checks c where c.meal_id = m.id and c.day = (now() at time zone 'America/Sao_Paulo')::date) as done,
        coalesce((select json_agg(json_build_object('food', i.food, 'quantity', i.quantity, 'notes', i.notes) order by i.position, i.id)
          from diet_items i where i.meal_id = m.id), '[]') as items
      from diet_meals m where m.student_id = ${st.id} order by m.position, m.id`),
    rows(s`select diet_notes, to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM') as hoje from students where id = ${st.id}`),
  ]);

  return (
    <div className="app">
      <main className="screen">
        <header className="top">
          <div className="grow"><h1>Minha dieta</h1><p>{meals.length ? `Hoje, ${d.hoje}` : 'Plano alimentar'}</p></div>
        </header>

        {meals.length ? (
          <>
            {d.diet_notes && (
              <section className="panel tight">
                <details>
                  <summary className="opt" style={{ borderTop: 0 }}><span>Orientações do professor</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
                  <p style={{ whiteSpace: 'pre-line', paddingBottom: 8 }}>{d.diet_notes}</p>
                </details>
              </section>
            )}
            <Refeicoes meals={meals as Refeicao[]} />
          </>
        ) : (
          <section className="panel empty">
            <span className="dot"><Icon name="utensils" size={28} /></span>
            <h2>Plano alimentar a caminho</h2>
            <p>Seu professor ainda não montou a sua dieta. Quando ele montar, as refeições aparecem aqui.</p>
          </section>
        )}
      </main>
      <Nav />
    </div>
  );
}
