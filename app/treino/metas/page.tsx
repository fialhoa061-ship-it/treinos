import { exigirAluno } from '@/lib/aluno';
import { jogo } from '@/lib/jogo';
import Icon from '../../Icon';
import { Act, Flash } from '../../admin/ui';
import Nav from '../Nav';
import { Conquistas, DesafioCard, MetaCard, NivelCard, Recordes, Semana } from '../Metas';
import { apagarMetaPessoal, criarMetaPessoal } from './actions';

export const metadata = { title: 'Minhas metas', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function MetasPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const st = await exigirAluno();
  const { m } = await searchParams;
  const j = await jogo(st.id);
  const doProfessor = j.metas.length + j.desafios.length;

  return (
    <div className="app">
      <main className="screen">
        <Flash m={m} />
        <header className="top">
          <div className="grow"><h1>Metas</h1><p>Seu progresso, seus desafios e suas conquistas</p></div>
        </header>

        <NivelCard n={j.nivel} />

        <section className="panel streak" aria-label="Sequência de treinos">
          <span className={j.streak ? 'flame on' : 'flame'}><Icon name="flame" size={30} /></span>
          <div className="grow">
            <h2>{j.streak ? `${j.streak} ${j.streak === 1 ? 'semana seguida' : 'semanas seguidas'}` : 'Comece sua sequência'}</h2>
            <p className="muted">{j.streak
              ? `Você bateu ${j.alvoSemana} treinos por semana.${j.melhorSequencia > j.streak ? ` Seu recorde: ${j.melhorSequencia}.` : ''}`
              : `Faça ${j.alvoSemana} treinos em uma semana para acender a chama.`}</p>
          </div>
        </section>

        <Semana dias={j.semanaDias}><span className="tag blue">{j.semana}/{j.alvoSemana} treinos</span></Semana>

        <DesafioCard d={j.desafio} />

        {doProfessor > 0 && <div className="section-t"><h2>Do seu professor</h2><span>{doProfessor}</span></div>}
        {j.metas.map(g => <MetaCard key={g.id} m={g} />)}
        {j.desafios.map(g => <MetaCard key={g.id} m={g} />)}

        <div className="section-t"><h2>Minhas metas</h2><span>{j.pessoais.length ? j.pessoais.length : 'crie a sua'}</span></div>
        {j.pessoais.map(g => (
          <MetaCard key={g.id} m={g} extra={
            <Act action={apagarMetaPessoal} fields={{ id: g.id }} cls="btn sm soft" label={<><Icon name="trash" size={16} />Apagar</>} confirm={`Apagar “${g.title}”?`} />
          } />
        ))}
        <details className="add">
          <summary><Icon name="plus" size={18} />Nova meta pessoal</summary>
          <div className="body">
            <form action={criarMetaPessoal} className="form">
              <label className="field"><span>O que você quer alcançar?</span>
                <select name="kind" defaultValue="sessions">
                  <option value="sessions">Fazer um número de treinos</option>
                  {j.refeicoes > 0 && <option value="diet_days">Completar a dieta em vários dias</option>}
                  <option value="water_days">Bater a meta de água em vários dias</option>
                </select>
              </label>
              <div className="grid2">
                <label className="field"><span>Quantos?</span><input name="target" inputMode="numeric" required placeholder="Ex.: 12" /></label>
                <label className="field"><span>Até quando?</span><input type="date" name="ends_on" required min={j.hoje} /></label>
              </div>
              <label className="field"><span>Nome (opcional)</span><input name="title" maxLength={80} placeholder="Ex.: Pronta para o verão" /></label>
              <button className="btn primary">Criar meta</button>
            </form>
          </div>
        </details>

        <Recordes list={j.recordes} />

        <Conquistas list={j.conquistas} />
      </main>
      <Nav />
    </div>
  );
}
