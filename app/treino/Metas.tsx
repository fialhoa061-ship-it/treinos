import Icon from '../Icon';
import type { Conquista, Meta } from '@/lib/jogo';

/** Cartão de meta ou desafio: título, barra de progresso, detalhe e prazo. Serve ao aluno e ao professor. */
export function MetaCard({ m, extra }: { m: Meta; extra?: React.ReactNode }) {
  const pct = Math.round(m.pct * 100);
  const prazo = m.dias === null ? null : m.feita ? null : m.vencida ? `Prazo encerrado em ${m.fim!.split('-').reverse().slice(0, 2).join('/')}`
    : m.dias === 0 ? 'Termina hoje' : `Faltam ${m.dias} ${m.dias === 1 ? 'dia' : 'dias'}`;
  return (
    <article className={`panel tight goal ${m.feita ? 'ok' : ''} ${m.vencida ? 'off' : ''}`}>
      <div className="goal-h">
        <span className="dot"><Icon name={m.feita ? 'check' : m.kind === 'weight' ? 'target' : 'dumbbell'} size={20} /></span>
        <div className="grow"><h3>{m.title}</h3><small>{m.detalhe}</small></div>
        <span className={`tag ${m.feita ? 'blue' : ''}`}>{m.feita ? 'Concluída' : `${pct}%`}</span>
      </div>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={m.title} style={{ ['--p' as string]: `${pct}%` }}><i /></div>
      {prazo && <p className={m.vencida ? 'goal-late' : 'goal-due'}><Icon name="calendar" size={14} />{prazo}</p>}
      {extra}
    </article>
  );
}

/** Grade de conquistas: as ganhas acesas, as demais com cadeado. */
export function Conquistas({ list }: { list: Conquista[] }) {
  const n = list.filter(c => c.ok).length;
  return (
    <>
      <div className="section-t"><h2>Conquistas</h2><span>{n} de {list.length}</span></div>
      <div className="badges">
        {list.map(c => (
          <div key={c.id} className={c.ok ? 'badge on' : 'badge'} title={c.texto}>
            <span className="badge-i"><Icon name={c.ok ? c.icon : 'lock'} size={24} /></span>
            <b>{c.titulo}</b>
            <small>{c.texto}</small>
          </div>
        ))}
      </div>
    </>
  );
}
