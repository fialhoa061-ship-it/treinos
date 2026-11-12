import { rows, sql } from '@/lib/db';
import { exigirAluno } from '@/lib/aluno';
import { jogo } from '@/lib/jogo';
import Icon from '../../Icon';
import Nav from '../Nav';
import { Semana } from '../Metas';
import Refeicoes, { type Refeicao } from './Refeicoes';

export const metadata = { title: 'Minha dieta', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function DietaPage() {
  const st = await exigirAluno();
  const s = sql();
  const [meals, [d], j] = await Promise.all([
    rows(s`select m.id, m.name, m.time_hint,
        exists (select 1 from diet_checks c where c.meal_id = m.id and c.day = (now() at time zone 'America/Sao_Paulo')::date) as done,
        coalesce((select json_agg(json_build_object('food', i.food, 'quantity', i.quantity, 'notes', i.notes) order by i.position, i.id)
          from diet_items i where i.meal_id = m.id), '[]') as items
      from diet_meals m where m.student_id = ${st.id} order by m.position, m.id`),
    rows(s`select diet_notes, to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM') as hoje from students where id = ${st.id}`),
    jogo(st.id),
  ]);

  return (
    <div className="app">
      <main className="screen">
        <header className="top">
          <div className="grow"><h1>Minha dieta</h1><p>Hoje, {d.hoje}</p></div>
        </header>

        {d.diet_notes && (
          <section className="panel tight">
            <details>
              <summary className="opt" style={{ borderTop: 0 }}><span>Orientações do professor</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
              <p style={{ whiteSpace: 'pre-line', paddingBottom: 8 }}>{d.diet_notes}</p>
            </details>
          </section>
        )}

        {meals.length === 0 && (
          <section className="panel empty">
            <span className="dot"><Icon name="utensils" size={28} /></span>
            <h2>Plano alimentar a caminho</h2>
            <p>Seu professor ainda não montou a sua dieta. Enquanto isso, você já pode marcar a água que bebe.</p>
          </section>
        )}

        <Refeicoes meals={meals as Refeicao[]} aguaHoje={j.aguaHoje} aguaMeta={j.aguaMeta} primeiraVez={j.refeicoesFeitas === 0 && j.aguaDias === 0 && j.aguaHoje === 0} />

        <Semana dias={j.semanaDias} titulo="Sua semana">
          {j.refeicoes > 0 && <span className="tag">{j.semanaDias.filter(x => x.dieta === 1).length} {j.semanaDias.filter(x => x.dieta === 1).length === 1 ? 'dia completo' : 'dias completos'}</span>}
        </Semana>
      </main>
      <Nav />
    </div>
  );
}
