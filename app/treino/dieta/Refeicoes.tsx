'use client';

import { useState, useTransition } from 'react';
import Icon from '../../Icon';
import { marcarRefeicao } from './actions';

export type Refeicao = { id: number; name: string; time_hint: string | null; done: boolean; items: { food: string; quantity: string | null; notes: string | null }[] };

/** Lista de refeições do dia: o aluno marca cada uma; a barra de progresso acompanha na hora. */
export default function Refeicoes({ meals }: { meals: Refeicao[] }) {
  const [done, setDone] = useState<Record<number, boolean>>(() => Object.fromEntries(meals.map(m => [m.id, m.done])));
  const [erro, setErro] = useState(false);
  const [, start] = useTransition();
  const feitas = meals.filter(m => done[m.id]).length;
  const pct = meals.length ? Math.round((feitas / meals.length) * 100) : 0;

  function toggle(id: number) {
    const on = !done[id];
    setDone(d => ({ ...d, [id]: on })); // responde na hora; volta atrás se o servidor recusar
    setErro(false);
    start(async () => {
      const r = await marcarRefeicao(id, on).catch(() => ({ ok: false }));
      if (!r.ok) { setDone(d => ({ ...d, [id]: !on })); setErro(true); }
    });
  }

  return (
    <>
      <section className="panel" aria-label="Progresso do dia">
        <div className="panel-h"><h2>{feitas === meals.length ? 'Dia completo!' : 'Refeições de hoje'}</h2><span className="tag blue">{feitas}/{meals.length}</span></div>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Refeições feitas hoje" style={{ ['--p' as string]: `${pct}%` }}><i /></div>
      </section>
      {erro && <p className="offline" role="alert"><Icon name="info" size={18} />Não deu para salvar agora. Confira a internet e tente de novo.</p>}

      {meals.map(m => (
        <article className={`panel tight meal ${done[m.id] ? 'ok' : ''}`} key={m.id}>
          <div className="meal-h">
            <button type="button" className="meal-chk" aria-pressed={!!done[m.id]} aria-label={`${m.name}: ${done[m.id] ? 'feita' : 'marcar como feita'}`} onClick={() => toggle(m.id)}>
              <Icon name="check" size={22} />
            </button>
            <div className="grow"><h3>{m.name}</h3>{m.time_hint && <small><Icon name="clock" size={14} />{m.time_hint}</small>}</div>
          </div>
          {m.items.length > 0 ? (
            <ul className="meal-items">
              {m.items.map((i, k) => (
                <li key={k}><b>{i.food}</b>{i.quantity && <span>{i.quantity}</span>}{i.notes && <small>{i.notes}</small>}</li>
              ))}
            </ul>
          ) : <p className="muted" style={{ fontSize: '.9rem' }}>Sem alimentos cadastrados nesta refeição.</p>}
        </article>
      ))}
    </>
  );
}
