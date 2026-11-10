import Icon from '../Icon';
import { studentLogout } from '../login/actions';

export type Ganho = { ex: string; primeiro: number; melhor: number };

const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/**
 * Ficha concluída: a validade definida pelo professor passou.
 * Fecha o ciclo com os números reais do aluno e deixa um caminho discreto para repetir a ficha atual.
 */
export default function Encerrado({ nome, fim, inicio, treinos, ganhos }: {
  nome: string; fim: string; inicio: string | null; treinos: number; ganhos: Ganho[];
}) {
  const first = nome.trim().split(/\s+/)[0] || nome;
  const ini = nome.trim().split(/\s+/).filter(w => /^\p{L}/u.test(w)).map(w => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();
  const semanas = inicio ? Math.max(1, Math.round((Date.parse(fim) - Date.parse(inicio)) / (7 * 86400_000))) : null;
  const media = semanas ? treinos / semanas : null;

  return (
    <main className="screen fim">
      <header className="top">
        <span className="avatar on" aria-hidden="true">{ini}</span>
        <div className="grow"><h1>Olá, {first}!</h1><p>Sua ficha chegou ao fim</p></div>
        <form action={studentLogout}><button className="ibtn" aria-label="Sair" title="Sair"><Icon name="logout" /></button></form>
      </header>

      <section className="fim-hero" aria-labelledby="fim-t">
        <span className="fim-tag"><Icon name="calendar" size={16} />Validade até {dmy(fim)}</span>
        <h2 id="fim-t">Ficha<br />concluída</h2>
        <p>{inicio ? <>Ciclo de <b>{dm(inicio)}</b> a <b>{dm(fim)}</b>.</> : <>Encerrada em <b>{dm(fim)}</b>.</>} Seu professor vai montar a próxima ficha.</p>
        <svg className="fim-arc" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="78" />
          <path d="M70 102l20 20 40-44" />
        </svg>
      </section>

      <section className="panel" aria-labelledby="ciclo-t">
        <h2 id="ciclo-t" className="fim-h">Neste ciclo</h2>
        <div className="fim-stats">
          <div><b>{treinos}</b><span>{treinos === 1 ? 'treino feito' : 'treinos feitos'}</span></div>
          <div><b>{media != null ? fmt(media) : '—'}</b><span>por semana, em média</span></div>
        </div>
        {ganhos.length > 0 ? (
          <>
            <p className="fim-sub">Onde sua carga mais subiu</p>
            <ol className="fim-ganhos">
              {ganhos.map(g => (
                <li key={g.ex}>
                  <span className="grow"><b>{g.ex}</b><small>{fmt(g.primeiro)} kg → {fmt(g.melhor)} kg</small></span>
                  <em>+{fmt(g.melhor - g.primeiro)} kg</em>
                </li>
              ))}
            </ol>
          </>
        ) : treinos > 0 ? (
          <p className="muted fim-sub">Registre a carga das séries na próxima ficha para ver aqui quanto ela subiu.</p>
        ) : null}
      </section>

      <section className="panel fim-next" aria-labelledby="next-t">
        <span className="dot"><Icon name="info" size={20} /></span>
        <div className="grow">
          <h2 id="next-t">E agora?</h2>
          <p>Fale com o seu professor: ele já foi avisado que a sua ficha venceu. Assim que montar a próxima, ela aparece aqui.</p>
        </div>
      </section>

      <a className="link fim-repetir" href="/treino?continuar=1">Repetir a ficha atual enquanto isso</a>
    </main>
  );
}
