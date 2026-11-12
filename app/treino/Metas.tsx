import Icon, { type IconName } from '../Icon';
import { XP, type Conquista, type Desafio, type Dia, type Meta, type Nivel, type Recorde } from '@/lib/jogo';

const pctOf = (x: number) => Math.round(x * 100);
const ddmm = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
const kg = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const ICONE: Record<Meta['kind'], IconName> = { weight: 'target', sessions_week: 'dumbbell', sessions: 'dumbbell', diet_days: 'utensils', water_days: 'droplet' };

function Bar({ pct, label }: { pct: number; label: string }) {
  const p = pctOf(pct);
  return <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} aria-label={label} style={{ ['--p' as string]: `${p}%` }}><i /></div>;
}

/** Cartão de meta ou desafio: título, barra de progresso, detalhe e prazo. Serve ao aluno e ao professor. */
export function MetaCard({ m, extra }: { m: Meta; extra?: React.ReactNode }) {
  const pct = pctOf(m.pct);
  const prazo = m.dias === null ? null : m.feita ? null : m.vencida ? `Prazo encerrado em ${ddmm(m.fim!)}`
    : m.dias === 0 ? 'Termina hoje' : `Faltam ${m.dias} ${m.dias === 1 ? 'dia' : 'dias'}`;
  return (
    <article className={`panel tight goal ${m.feita ? 'ok' : ''} ${m.vencida ? 'off' : ''}`}>
      <div className="goal-h">
        <span className="dot"><Icon name={m.feita ? 'check' : ICONE[m.kind]} size={20} /></span>
        <div className="grow"><h3>{m.title}</h3><small>{m.detalhe}</small></div>
        <span className={`tag ${m.feita ? 'blue' : ''}`}>{m.feita ? 'Concluída' : `${pct}%`}</span>
      </div>
      <Bar pct={m.pct} label={m.title} />
      {prazo && <p className={m.vencida ? 'goal-late' : 'goal-due'}><Icon name="calendar" size={14} />{prazo}</p>}
      {extra}
    </article>
  );
}

/** Nível e XP: o aluno sobe de nível treinando, comendo bem, bebendo água e cumprindo desafios. */
export function NivelCard({ n, quem = 'Você' }: { n: Nivel; quem?: string }) {
  return (
    <section className="panel level" aria-label="Nível">
      <div className="level-h">
        <span className="level-n" aria-hidden="true"><Icon name="star" size={18} /><b>{n.n}</b></span>
        <div className="grow"><small>Nível {n.n}</small><h2>{n.nome}</h2></div>
        <span className="tag blue">{n.xp.toLocaleString('pt-BR')} XP</span>
      </div>
      <Bar pct={n.pct} label="Progresso até o próximo nível" />
      <p className="level-f"><span>{n.noNivel} / {n.proximo} XP</span><span>faltam {n.proximo - n.noNivel} para o nível {n.n + 1}</span></p>
      <details className="level-how">
        <summary>Como {quem === 'Você' ? 'ganhar' : 'se ganha'} XP</summary>
        <ul>
          <li><Icon name="dumbbell" size={16} />Treino finalizado<b>+{XP.treino}</b></li>
          <li><Icon name="utensils" size={16} />Refeição marcada<b>+{XP.refeicao}</b></li>
          <li><Icon name="check" size={16} />Dia com a dieta completa<b>+{XP.dietaDia}</b></li>
          <li><Icon name="droplet" size={16} />Dia batendo a meta de água<b>+{XP.agua}</b></li>
          <li><Icon name="zap" size={16} />Desafio da semana cumprido<b>+{XP.desafio}</b></li>
          <li><Icon name="trophy" size={16} />Conquista desbloqueada<b>+{XP.conquista}</b></li>
        </ul>
      </details>
    </section>
  );
}

/** Os 7 dias da semana (segunda a domingo) com treino, dieta e água de cada dia. */
export function Semana({ dias, titulo = 'Sua semana', children }: { dias: Dia[]; titulo?: string; children?: React.ReactNode }) {
  const temDieta = dias.some(d => d.dieta !== null);
  return (
    <section className="panel" aria-label={titulo}>
      <div className="panel-h"><h2>{titulo}</h2>{children}</div>
      <ol className="week">
        {dias.map(d => (
          <li key={d.d} className={`${d.hoje ? 'today' : ''} ${d.futuro ? 'future' : ''}`}
            aria-label={`${ddmm(d.d)}: ${d.futuro ? 'ainda não chegou' : [d.treino ? 'treinou' : 'sem treino', temDieta ? `dieta ${pctOf(d.dieta ?? 0)}%` : '', d.agua ? 'bateu a água' : ''].filter(Boolean).join(', ')}`}>
            <span className="wk-l">{d.letra}</span>
            <span className={`wk-t ${d.treino ? 'on' : ''}`}><Icon name={d.treino ? 'check' : 'dumbbell'} size={16} /></span>
            {temDieta && <span className="wk-bar" style={{ ['--p' as string]: `${pctOf(d.dieta ?? 0)}%` }}><i /></span>}
            <span className={`wk-a ${d.agua ? 'on' : ''}`}><Icon name="droplet" size={13} /></span>
          </li>
        ))}
      </ol>
      <p className="week-k">
        <span><i className="k-t" />Treino</span>
        {temDieta && <span><i className="k-d" />Dieta</span>}
        <span><i className="k-a" />Água</span>
      </p>
    </section>
  );
}

/** Desafio da semana: troca toda segunda-feira. */
export function DesafioCard({ d }: { d: Desafio }) {
  return (
    <section className={`panel challenge ${d.feito ? 'ok' : ''}`} aria-label="Desafio da semana">
      <div className="goal-h">
        <span className="dot"><Icon name={d.feito ? 'check' : d.icon} size={22} /></span>
        <div className="grow"><small className="eyebrow">Desafio da semana</small><h3>{d.titulo}</h3></div>
        <span className="tag blue">+{XP.desafio} XP</span>
      </div>
      <p className="challenge-t">{d.texto}</p>
      <Bar pct={d.pct} label={d.titulo} />
      <p className="level-f">
        <span>{d.atual} de {d.alvo}</span>
        <span>{d.feito ? 'Cumprido! Novo desafio na segunda' : d.diasRestantes === 0 ? 'Último dia' : `${d.diasRestantes} ${d.diasRestantes === 1 ? 'dia' : 'dias'} restantes`}</span>
      </p>
    </section>
  );
}

/** Melhores cargas por exercício, das mais recentes para as mais antigas. */
export function Recordes({ list }: { list: Recorde[] }) {
  if (!list.length) return null;
  return (
    <>
      <div className="section-t"><h2>Recordes de carga</h2><span>últimos</span></div>
      <section className="panel tight">
        <ul className="prs">
          {list.map(r => {
            const ganho = r.primeiro > 0 ? Math.round(((r.melhor - r.primeiro) / r.primeiro) * 100) : 0;
            return (
              <li key={r.ex}>
                <span className="dot"><Icon name="medal" size={18} /></span>
                <span className="grow"><b>{r.ex}</b><small>Em {ddmm(r.quando)}{ganho > 0 ? ` · começou com ${kg(r.primeiro)} kg` : ''}</small></span>
                <span className="pr-v"><b>{kg(r.melhor)} kg</b>{ganho > 0 && <small>+{ganho}%</small>}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/** Grade de conquistas: as ganhas acesas; as bloqueadas mostram quanto falta. A mais perto de sair aparece em destaque. */
export function Conquistas({ list }: { list: Conquista[] }) {
  const n = list.filter(c => c.ok).length;
  const proxima = list.filter(c => !c.ok && c.atual > 0).sort((a, b) => b.atual / b.alvo - a.atual / a.alvo)[0];
  return (
    <>
      <div className="section-t"><h2>Conquistas</h2><span>{n} de {list.length}</span></div>
      {proxima && (
        <section className="panel tight next-badge" aria-label="Próxima conquista">
          <div className="goal-h">
            <span className="dot"><Icon name={proxima.icon} size={20} /></span>
            <div className="grow"><small className="eyebrow">Quase lá</small><h3>{proxima.titulo}</h3><small>{proxima.texto}</small></div>
            <span className="tag">{proxima.atual}/{proxima.alvo}</span>
          </div>
          <Bar pct={proxima.atual / proxima.alvo} label={proxima.titulo} />
        </section>
      )}
      <div className="badges">
        {list.map(c => (
          <div key={c.id} className={c.ok ? 'badge on' : 'badge'}>
            <span className="badge-i"><Icon name={c.ok ? c.icon : 'lock'} size={24} /></span>
            <b>{c.titulo}</b>
            <small>{c.texto}</small>
            {!c.ok && c.alvo > 1 && <span className="badge-p" aria-label={`${c.atual} de ${c.alvo}`}><i style={{ width: `${pctOf(c.atual / c.alvo)}%` }} /></span>}
          </div>
        ))}
      </div>
    </>
  );
}
