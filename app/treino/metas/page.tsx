import { exigirAluno } from '@/lib/aluno';
import { jogo } from '@/lib/jogo';
import Icon from '../../Icon';
import Nav from '../Nav';
import { Conquistas, MetaCard } from '../Metas';

export const metadata = { title: 'Minhas metas', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function MetasPage() {
  const st = await exigirAluno();
  const j = await jogo(st.id);
  const pctSemana = Math.min(100, Math.round((j.semana / j.alvoSemana) * 100));

  return (
    <div className="app">
      <main className="screen">
        <header className="top">
          <div className="grow"><h1>Metas</h1><p>Seu progresso e suas conquistas</p></div>
        </header>

        <section className="panel streak" aria-label="Sequência de treinos">
          <span className={j.streak ? 'flame on' : 'flame'}><Icon name="flame" size={30} /></span>
          <div className="grow">
            <h2>{j.streak ? `${j.streak} ${j.streak === 1 ? 'semana seguida' : 'semanas seguidas'}` : 'Comece sua sequência'}</h2>
            <p className="muted">{j.streak ? `Você bateu ${j.alvoSemana} treinos por semana.` : `Faça ${j.alvoSemana} treinos em uma semana para acender a chama.`}</p>
          </div>
        </section>

        <section className="panel" aria-label="Treinos desta semana">
          <div className="panel-h"><h2>Esta semana</h2><span className="tag blue">{j.semana}/{j.alvoSemana}</span></div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctSemana} aria-label="Treinos da semana" style={{ ['--p' as string]: `${pctSemana}%` }}><i /></div>
          <p className="muted" style={{ marginTop: 10, fontSize: '.9rem' }}>{j.treinos} {j.treinos === 1 ? 'treino finalizado' : 'treinos finalizados'} no total</p>
        </section>

        {j.metas.length > 0 && <><div className="section-t"><h2>Minhas metas</h2><span>{j.metas.length}</span></div>{j.metas.map(m => <MetaCard key={m.id} m={m} />)}</>}
        {j.desafios.length > 0 && <><div className="section-t"><h2>Desafios</h2><span>{j.desafios.length}</span></div>{j.desafios.map(m => <MetaCard key={m.id} m={m} />)}</>}
        {j.metas.length === 0 && j.desafios.length === 0 && (
          <p className="muted" style={{ padding: '0 4px' }}>Seu professor ainda não definiu metas nem desafios. Quando definir, eles aparecem aqui.</p>
        )}

        <Conquistas list={j.conquistas} />
      </main>
      <Nav />
    </div>
  );
}
