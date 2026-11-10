import { rows, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import Icon from '../../Icon';
import { Act, Flash, Top } from '../ui';
import { deleteTemplate, renameTemplate } from '../acoes-modelos';

type T = { id: number; owner_id: number | null; name: string; description: string | null; treinos: { nome: string; foco: string | null; ex: { n: string; s: number; r: string }[] }[] };

export default async function Modelos({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const uid = await requireAdmin();
  const list = await rows(sql()`
    select t.id, t.owner_id, t.name, t.description,
      coalesce((select json_agg(json_build_object('nome', tw.name, 'foco', tw.focus,
        'ex', coalesce((select json_agg(json_build_object('n', e.name, 's', e.sets, 'r', e.reps) order by e.position, e.id) from template_exercises e where e.template_workout_id = tw.id), '[]'))
        order by tw.position, tw.id) from template_workouts tw where tw.template_id = t.id), '[]') as treinos
    from templates t where t.owner_id = ${uid} or t.owner_id is null
    order by (t.owner_id is null), t.name`) as T[];
  const meus = list.filter(t => t.owner_id !== null), prontos = list.filter(t => t.owner_id === null);

  return (
    <>
      <Flash m={m} />
      <Top title="Modelos de ficha" sub="Monte uma vez e aplique a vários alunos" back="/admin/biblioteca" />

      <section className="panel">
        <p className="muted" style={{ fontSize: '.9rem' }}>
          Para <b>aplicar</b> um modelo, abra o aluno e use <b>Aplicar modelo</b>: os treinos entram na ficha dele e você ajusta o que quiser.
          Para <b>criar</b> um modelo, monte a ficha de um aluno e use <b>Salvar ficha como modelo</b>.
        </p>
      </section>

      <div className="section-t"><h2>Meus modelos</h2><span>{meus.length}</span></div>
      {meus.length === 0
        ? <div className="panel"><p className="muted">Você ainda não salvou nenhum modelo.</p></div>
        : <div className="list">{meus.map(t => <Modelo key={t.id} t={t} meu />)}</div>}

      <div className="section-t"><h2>Modelos prontos</h2><span>{prontos.length}</span></div>
      <div className="list">{prontos.map(t => <Modelo key={t.id} t={t} />)}</div>
    </>
  );
}

function Modelo({ t, meu }: { t: T; meu?: boolean }) {
  const ex = t.treinos.reduce((n, w) => n + w.ex.length, 0);
  return (
    <details className="exr">
      <summary>
        <span className="dot"><Icon name="layers" size={20} /></span>
        <span className="grow"><b>{t.name}</b><small>{t.treinos.length} {t.treinos.length === 1 ? 'treino' : 'treinos'} · {ex} exercícios{t.description ? ` · ${t.description}` : ''}</small></span>
        <span className="ibtn sq"><Icon name="right" size={16} /></span>
      </summary>
      <div className="body">
        {t.treinos.map((w, i) => (
          <div key={i} className="tpl-w">
            <b>Treino {w.nome}{w.foco ? ` · ${w.foco}` : ''}</b>
            <ol>{w.ex.map((e, j) => <li key={j}>{e.n} <span>{e.s} × {e.r}</span></li>)}</ol>
          </div>
        ))}
        {meu && (
          <>
            <form action={renameTemplate} className="form">
              <input type="hidden" name="id" value={t.id} />
              <label className="field"><span>Nome</span><input name="name" required maxLength={80} defaultValue={t.name} /></label>
              <label className="field"><span>Descrição</span><input name="description" maxLength={300} defaultValue={t.description ?? ''} placeholder="Ex.: 3x por semana, iniciante" /></label>
              <button className="btn">Salvar</button>
            </form>
            <Act action={deleteTemplate} fields={{ id: t.id }} cls="btn danger" label={<><Icon name="trash" size={18} />Excluir modelo</>} confirm={`Excluir o modelo "${t.name}"? Os alunos que já usam essa ficha não mudam.`} />
          </>
        )}
      </div>
    </details>
  );
}
