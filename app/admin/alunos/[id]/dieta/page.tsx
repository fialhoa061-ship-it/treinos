import { notFound } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import Icon from '../../../../Icon';
import { Act, Flash, Top } from '../../../ui';
import { addDefaultMeals, deleteItem, deleteMeal, moveMeal, saveDietNotes, saveItem, saveMeal, saveWaterGoal } from '../../../acoes-bemestar';

function ItemFields({ mealId, it }: { mealId: number; it?: { id: number; food: string; quantity: string | null; notes: string | null } }) {
  return (
    <>
      {it && <input type="hidden" name="id" value={it.id} />}
      <input type="hidden" name="meal_id" value={mealId} />
      <label className="field"><span>Alimento</span><input name="food" required maxLength={120} placeholder="Ex.: Ovo mexido" defaultValue={it?.food} /></label>
      <div className="grid2">
        <label className="field"><span>Quantidade</span><input name="quantity" maxLength={60} placeholder="Ex.: 2 unidades" defaultValue={it?.quantity ?? ''} /></label>
        <label className="field"><span>Observação</span><input name="notes" maxLength={200} placeholder="Ex.: sem sal" defaultValue={it?.notes ?? ''} /></label>
      </div>
    </>
  );
}

export default async function DietaAluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const id = Number((await params).id);
  const { m } = await searchParams;
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) notFound();
  const uid = await requireAdmin();
  const s = sql();
  const [st] = await rows(s`select id, name, diet_notes, water_cups from students where id=${id} and owner_id=${uid}`);
  if (!st) notFound();
  const [meals, items, [adesao], [agua]] = await Promise.all([
    rows(s`select * from diet_meals where student_id=${id} order by position, id`),
    rows(s`select i.* from diet_items i join diet_meals m on m.id = i.meal_id where m.student_id=${id} order by i.position, i.id`),
    // adesão: refeições marcadas nos últimos 7 dias em relação ao esperado
    rows(s`select count(*)::int as feitas, (select count(*)::int from diet_meals where student_id=${id}) * 7 as total
      from diet_checks where student_id=${id} and day > (now() at time zone 'America/Sao_Paulo')::date - 7`),
    // água nos últimos 7 dias: dias em que bateu a meta e média de copos (dias sem registro contam como zero)
    rows(s`select count(*) filter (where cups >= ${st.water_cups})::int as dias, coalesce(sum(cups), 0)::int as copos
      from water_logs where student_id=${id} and day > (now() at time zone 'America/Sao_Paulo')::date - 7`),
  ]);
  const litros = (copos: number) => (copos * 0.25).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const primeiro = st.name.split(' ')[0];
  const pct = adesao.total ? Math.round((adesao.feitas / adesao.total) * 100) : 0;

  return (
    <>
      <Flash m={m} />
      <Top title="Plano alimentar" sub={st.name} back={`/admin/alunos/${id}`} />

      {meals.length > 0 && (
        <section className="panel tight" aria-label="Adesão da semana">
          <div className="panel-h" style={{ marginBottom: 10 }}><h2>Adesão nos últimos 7 dias</h2><span className="tag blue">{pct}%</span></div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Adesão à dieta" style={{ ['--p' as string]: `${pct}%` }}><i /></div>
          <p className="muted" style={{ fontSize: '.86rem', marginTop: 8 }}>{adesao.feitas} de {adesao.total} refeições marcadas por {primeiro}</p>
        </section>
      )}

      {meals.length === 0 && (
        <section className="panel empty">
          <span className="dot"><Icon name="utensils" size={28} /></span>
          <h2>Monte o plano de {primeiro}</h2>
          <p>Comece com as refeições padrão do dia e depois adicione os alimentos de cada uma.</p>
          <Act action={addDefaultMeals} fields={{ student_id: id }} cls="btn primary" label={<><Icon name="plus" size={18} />Criar refeições padrão</>} />
        </section>
      )}

      {meals.map((meal, idx) => {
        const its = items.filter(i => i.meal_id === meal.id);
        return (
          <section className="panel tight wo" key={meal.id} aria-label={meal.name}>
            <div className="wo-h">
              <span className="num"><Icon name="utensils" size={22} /></span>
              <div className="grow"><h3>{meal.name}</h3><small>{meal.time_hint ? `${meal.time_hint} · ` : ''}{its.length} {its.length === 1 ? 'alimento' : 'alimentos'}</small></div>
              <div className="tools">
                <Act action={moveMeal} fields={{ id: meal.id, dir: -1 }} cls="ibtn sq" title="Mover para cima" label={<Icon name="up" size={16} />} />
                <Act action={moveMeal} fields={{ id: meal.id, dir: 1 }} cls="ibtn sq" title="Mover para baixo" label={<Icon name="down" size={16} />} />
              </div>
            </div>

            <div className="list">
              {its.map(it => (
                <details className="exr" key={it.id}>
                  <summary>
                    <span className="num" style={{ fontSize: '.9rem' }}>{its.indexOf(it) + 1}</span>
                    <span className="grow"><b>{it.food}</b><small>{[it.quantity, it.notes].filter(Boolean).join(' · ') || 'Sem quantidade'}</small></span>
                    <span className="ibtn sq"><Icon name="right" size={16} /></span>
                  </summary>
                  <div className="body">
                    <form action={saveItem} className="form"><ItemFields mealId={meal.id} it={it as never} /><button className="btn primary">Salvar alimento</button></form>
                    <Act action={deleteItem} fields={{ id: it.id, meal_id: meal.id }} cls="btn sm danger" label={<><Icon name="trash" size={16} />Excluir</>} confirm={`Excluir “${it.food}”?`} />
                  </div>
                </details>
              ))}
              <details className="add">
                <summary><Icon name="plus" size={18} />Adicionar alimento</summary>
                <div className="body"><form action={saveItem} className="form"><ItemFields mealId={meal.id} /><button className="btn primary">Adicionar à refeição</button></form></div>
              </details>
            </div>

            <details>
              <summary className="opt"><span>Editar ou excluir refeição</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
              <div className="form" style={{ paddingBottom: 6 }}>
                <form action={saveMeal} className="form">
                  <input type="hidden" name="id" value={meal.id} /><input type="hidden" name="student_id" value={id} />
                  <div className="grid2" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <label className="field"><span>Nome</span><input name="name" required maxLength={60} defaultValue={meal.name} /></label>
                    <label className="field"><span>Horário</span><input name="time_hint" maxLength={20} placeholder="07:30" defaultValue={meal.time_hint ?? ''} /></label>
                  </div>
                  <button className="btn">Salvar refeição</button>
                </form>
                <Act action={deleteMeal} fields={{ id: meal.id }} cls="btn danger" label={<><Icon name="trash" size={18} />Excluir refeição</>} confirm={`Excluir “${meal.name}” e seus alimentos?`} />
              </div>
            </details>
          </section>
        );
      })}

      {meals.length > 0 && (
        <details className="add">
          <summary><Icon name="plus" size={18} />Nova refeição</summary>
          <div className="body">
            <form action={saveMeal} className="form">
              <input type="hidden" name="student_id" value={id} />
              <div className="grid2" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <label className="field"><span>Nome</span><input name="name" required maxLength={60} placeholder="Ex.: Pré-treino" /></label>
                <label className="field"><span>Horário</span><input name="time_hint" maxLength={20} placeholder="17:30" /></label>
              </div>
              <button className="btn primary">Criar refeição</button>
            </form>
          </div>
        </details>
      )}

      <section className="panel tight" aria-label="Água">
        <div className="panel-h" style={{ marginBottom: 10 }}><h2>Água</h2><span className="tag blue">{agua.dias}/7 dias na meta</span></div>
        <p className="muted" style={{ fontSize: '.86rem', marginBottom: 12 }}>
          Média de {litros(agua.copos / 7)} L por dia nos últimos 7 dias. {primeiro} marca os copos na tela da dieta.
        </p>
        <form action={saveWaterGoal} className="form">
          <input type="hidden" name="student_id" value={id} />
          <div className="grid2" style={{ alignItems: 'end' }}>
            <label className="field"><span>Meta diária (copos de 250 ml)</span><input name="cups" type="number" inputMode="numeric" min={1} max={30} required defaultValue={st.water_cups} /></label>
            <button className="btn">Salvar meta</button>
          </div>
        </form>
      </section>

      <section className="panel tight" aria-label="Orientações gerais">
        <details open={!!st.diet_notes}>
          <summary className="opt" style={{ borderTop: 0 }}><span>Orientações gerais da dieta</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
          <form action={saveDietNotes} className="form" style={{ paddingBottom: 6 }}>
            <input type="hidden" name="student_id" value={id} />
            <label className="field"><span>Texto que {primeiro} vê no topo da dieta</span>
              <textarea name="notes" rows={5} maxLength={3000} placeholder="Ex.: beber 2,5 L de água por dia, evitar frituras, trocar o pão por tapioca nos dias de treino pesado…" defaultValue={st.diet_notes ?? ''} />
            </label>
            <button className="btn primary">Salvar orientações</button>
          </form>
        </details>
      </section>
    </>
  );
}
