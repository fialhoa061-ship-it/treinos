import { notFound } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { jogo } from '@/lib/jogo';
import Icon from '../../../../Icon';
import { MetaCard, Conquistas } from '../../../../treino/Metas';
import { Act, Flash, Top } from '../../../ui';
import { deleteGoal, saveGoal } from '../../../acoes-bemestar';

export default async function MetasAluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const id = Number((await params).id);
  const { m } = await searchParams;
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) notFound();
  const uid = await requireAdmin();
  const [st] = await rows(sql()`select id, name from students where id=${id} and owner_id=${uid}`);
  if (!st) notFound();
  const j = await jogo(id);
  const primeiro = st.name.split(' ')[0];
  const apagar = (goalId: number, nome: string) => (
    <Act action={deleteGoal} fields={{ id: goalId, student_id: id }} cls="btn sm danger" label={<><Icon name="trash" size={16} />Remover</>} confirm={`Remover “${nome}”?`} />
  );

  return (
    <>
      <Flash m={m} />
      <Top title="Metas e desafios" sub={st.name} back={`/admin/alunos/${id}`} />

      <section className="panel streak" aria-label="Sequência">
        <span className={j.streak ? 'flame on' : 'flame'}><Icon name="flame" size={30} /></span>
        <div className="grow">
          <h2>{j.streak ? `${j.streak} ${j.streak === 1 ? 'semana seguida' : 'semanas seguidas'}` : 'Sem sequência ainda'}</h2>
          <p className="muted">{j.semana}/{j.alvoSemana} treinos esta semana · {j.treinos} no total · melhor sequência: {j.melhorSequencia}</p>
        </div>
      </section>

      <div className="section-t"><h2>Metas</h2><span>{j.metas.length}</span></div>
      {j.metas.map(g => <MetaCard key={g.id} m={g} extra={apagar(g.id, g.title)} />)}
      <details className="add">
        <summary><Icon name="plus" size={18} />Nova meta</summary>
        <div className="body">
          <form action={saveGoal} className="form">
            <input type="hidden" name="student_id" value={id} />
            <label className="field"><span>Tipo</span>
              <select name="kind" defaultValue="sessions_week">
                <option value="sessions_week">Treinos por semana</option>
                <option value="weight">Peso alvo (kg)</option>
              </select>
            </label>
            <label className="field"><span>Alvo</span><input name="target" inputMode="decimal" required placeholder="Ex.: 4 treinos ou 62,5 kg" /></label>
            <label className="field"><span>Nome (opcional)</span><input name="title" maxLength={80} placeholder="Ex.: Fechar a semana" /></label>
            <p className="muted" style={{ fontSize: '.84rem' }}>Treinos por semana: uma só por aluno, criar de novo troca a atual. A meta de peso parte do peso de hoje ({primeiro}).</p>
            <button className="btn primary">Criar meta</button>
          </form>
        </div>
      </details>

      <div className="section-t"><h2>Desafios</h2><span>{j.desafios.length}</span></div>
      {j.desafios.map(g => <MetaCard key={g.id} m={g} extra={apagar(g.id, g.title)} />)}
      <details className="add">
        <summary><Icon name="plus" size={18} />Novo desafio</summary>
        <div className="body">
          <form action={saveGoal} className="form">
            <input type="hidden" name="student_id" value={id} />
            <label className="field"><span>Tipo</span>
              <select name="kind" defaultValue="sessions">
                <option value="sessions">Treinos no período</option>
                <option value="diet_days">Dias com a dieta completa</option>
              </select>
            </label>
            <div className="grid2">
              <label className="field"><span>Alvo</span><input name="target" inputMode="numeric" required placeholder="Ex.: 12" /></label>
              <label className="field"><span>Termina em</span><input type="date" name="ends_on" required /></label>
            </div>
            <label className="field"><span>Nome (opcional)</span><input name="title" maxLength={80} placeholder="Ex.: Desafio de novembro" /></label>
            <label className="check"><input type="checkbox" name="all_students" /><span>Aplicar a todos os meus alunos</span></label>
            <button className="btn primary">Criar desafio</button>
          </form>
        </div>
      </details>

      <Conquistas list={j.conquistas} />
    </>
  );
}
