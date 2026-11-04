'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from '../Icon';

/** Barra de abas inferior do professor, com o + central para novo aluno. */
export function TabBar({ logout }: { logout: (f: FormData) => Promise<void> }) {
  const path = usePathname();
  const tab = (href: string, label: string, icon: IconName, match: (p: string) => boolean) => (
    <Link href={href} aria-current={match(path) ? 'page' : undefined}><Icon name={icon} size={24} />{label}</Link>
  );
  return (
    <div className="tabbar">
      <nav aria-label="Navegação">
        {tab('/admin', 'Alunos', 'users', p => p === '/admin' || p.startsWith('/admin/alunos') || p.startsWith('/admin/historico'))}
        {tab('/admin/biblioteca', 'Biblioteca', 'book', p => p.startsWith('/admin/biblioteca'))}
        <Link href="/admin/novo" className="fab" aria-label="Novo aluno" aria-current={path === '/admin/novo' ? 'page' : undefined}><Icon name="plus" size={28} /></Link>
        {tab('/admin/backup', 'Backup', 'archive', p => p.startsWith('/admin/backup'))}
        <form action={logout}><button type="submit"><Icon name="logout" size={24} />Sair</button></form>
      </nav>
    </div>
  );
}

export function ConfirmButton({ confirm: msg, className, title, children }: { confirm?: string; className?: string; title?: string; children: React.ReactNode }) {
  return <button className={className} title={title} aria-label={title} onClick={e => { if (msg && !window.confirm(msg)) e.preventDefault(); }}>{children}</button>;
}

/** Cartão do código de acesso: dígitos grandes, envio pelo WhatsApp em destaque, copiar e trocar o código abaixo. */
export function AccessCode({ code, name, regenerate }: { code: string | null; name: string; regenerate: React.ReactNode }) {
  const [site, setSite] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => setSite(location.origin), []);
  useEffect(() => { if (!done) return; const t = setTimeout(() => setDone(false), 2000); return () => clearTimeout(t); }, [done]);
  const msg = code ? `Oi, ${name}! Seu treino está pronto. Acesse ${site}/login, toque em "Aluno" e digite o código ${code}.` : '';
  return (
    <section className="panel" aria-labelledby="code-t">
      <div className="panel-h">
        <h2 id="code-t">Código de acesso</h2>
      </div>
      {code ? (
        <>
          <div className="code-digits" role="img" aria-label={`Código ${code.split('').join(' ')}`}>
            {code.split('').map((d, i) => <span key={i} aria-hidden="true">{d}</span>)}
          </div>
          <a className="btn primary block" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(msg)}`}>
            <Icon name="chat" />Enviar no WhatsApp
          </a>
          <div className="code-sub">
            <button type="button" className="btn soft" onClick={async () => { await navigator.clipboard.writeText(code); setDone(true); }} aria-live="polite">
              <Icon name={done ? 'check' : 'copy'} size={18} />{done ? 'Copiado' : 'Copiar'}
            </button>
            {regenerate}
          </div>
        </>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 14 }}>Este aluno ainda não tem código. Gere um para enviar pelo WhatsApp.</p>
          {regenerate}
        </>
      )}
    </section>
  );
}

type Lib = { name: string; video_url: string | null; notes: string | null };
type Ex = { id?: number; name?: string; sets?: number; reps?: string; rest?: string; notes?: string | null; video_url?: string | null };

/** Formulário de exercício; no modo "novo" permite preencher a partir da biblioteca. */
export function ExerciseForm({ action, workoutId, ex = {}, library, label }: {
  action: (f: FormData) => Promise<void>; workoutId: number; ex?: Ex; library?: Lib[]; label: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  function fill(l: Lib) {
    const f = ref.current;
    if (!f) return;
    (f.elements.namedItem('name') as HTMLInputElement).value = l.name;
    (f.elements.namedItem('video_url') as HTMLInputElement).value = l.video_url ?? '';
    (f.elements.namedItem('notes') as HTMLTextAreaElement).value = l.notes ?? '';
  }
  return (
    <form action={action} ref={ref} className="form">
      <input type="hidden" name="id" value={ex.id ?? 0} />
      <input type="hidden" name="workout_id" value={workoutId} />
      {library && library.length > 0 && <LibraryPicker library={library} onPick={fill} />}

      <fieldset className="group">
        <legend>Exercício</legend>
        <label className="field"><span>Nome</span><input name="name" required autoComplete="off" placeholder="Ex.: Supino reto com barra" defaultValue={ex.name} /></label>
      </fieldset>

      <fieldset className="group">
        <legend>Prescrição</legend>
        <div className="grid3">
          <label className="field"><span>Séries</span><input name="sets" type="number" inputMode="numeric" min={1} max={20} defaultValue={ex.sets ?? 3} /></label>
          <label className="field"><span>Repetições</span><input name="reps" placeholder="8–10" defaultValue={ex.reps ?? '10'} /></label>
          <label className="field"><span>Descanso</span><input name="rest" placeholder="90 s" defaultValue={ex.rest ?? '90 s'} /></label>
        </div>
      </fieldset>

      <fieldset className="group">
        <legend>Detalhes <small>opcional</small></legend>
        <label className="field"><span>Observações</span><textarea name="notes" rows={2} placeholder="Dica de execução que o aluno vê no treino" defaultValue={ex.notes ?? ''} /></label>
        <label className="field"><span>Link do vídeo</span><input name="video_url" type="url" inputMode="url" placeholder="https://youtube.com/…" defaultValue={ex.video_url ?? ''} /></label>
      </fieldset>

      <button className="btn primary block">{label}</button>
    </form>
  );
}

// busca sem acento e sem diferença de maiúsculas: "bulgaro" acha "Búlgaro"
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Seletor da biblioteca: busca + lista rolável; ao escolher, preenche o formulário e mostra o escolhido. */
function LibraryPicker({ library, onPick }: { library: Lib[]; onPick: (l: Lib) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Lib | null>(null);
  const list = q ? library.filter(l => norm(l.name).includes(norm(q.trim()))) : library;
  const choose = (l: Lib) => { onPick(l); setPicked(l); setOpen(false); setQ(''); };

  if (picked) {
    return (
      <div className="picked">
        <span className="dot"><Icon name="check" size={18} /></span>
        <span className="grow"><small>Da biblioteca</small><b>{picked.name}</b></span>
        <button type="button" className="btn sm" onClick={() => { setPicked(null); setOpen(true); }}>Trocar</button>
      </div>
    );
  }
  return (
    <div className="picker">
      <button type="button" className="picker-h" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="dot"><Icon name="book" size={18} /></span>
        <span className="grow"><b>Escolher da biblioteca</b><small>{library.length} exercícios salvos</small></span>
        <span className="ibtn sq"><Icon name={open ? 'up' : 'down'} size={16} /></span>
      </button>
      {open && (
        <div className="picker-b">
          <label className="search">
            <Icon name="search" size={18} />
            <input type="search" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar exercício" aria-label="Buscar na biblioteca"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (list[0]) choose(list[0]); } if (e.key === 'Escape') setOpen(false); }} />
          </label>
          <ul className="picker-l" aria-label="Exercícios da biblioteca">
            {list.map(l => (
              <li key={l.name}>
                <button type="button" onClick={() => choose(l)}>
                  <span className="grow">{l.name}</span>
                  {l.video_url && <span className="has"><Icon name="play" size={14} />vídeo</span>}
                </button>
              </li>
            ))}
            {!list.length && <li className="none">Nenhum exercício com “{q}”. Preencha o nome abaixo.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Gráfico de linha (maior carga por sessão), em azul sobre grafite. */
export function Chart({ pts }: { pts: [string, number][] }) {
  const W = 600, H = 220, PX = 34, PT = 34, PB = 34;
  const ys = pts.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const X = (i: number) => (pts.length > 1 ? PX + (i * (W - 2 * PX)) / (pts.length - 1) : W / 2);
  const Y = (v: number) => H - PB - ((v - lo) / span) * (H - PT - PB);
  const line = pts.map((p, i) => `${X(i)},${Y(p[1])}`).join(' ');
  const every = Math.ceil(pts.length / 8); // no máximo ~8 rótulos de data
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolução da carga: de ${pts[0]?.[1]} a ${pts.at(-1)?.[1]} kg`}>
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6bff" stopOpacity=".32" /><stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, .5, 1].map(f => <line key={f} x1={PX} x2={W - PX} y1={PT + f * (H - PT - PB)} y2={PT + f * (H - PT - PB)} stroke="#2a2b31" strokeWidth="1" />)}
      {pts.length > 1 && <polygon fill="url(#chart-fill)" points={`${X(0)},${H - PB} ${line} ${X(pts.length - 1)},${H - PB}`} />}
      <polyline fill="none" stroke="#4a80ff" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" points={line} />
      {pts.map((p, i) => (
        <g key={p[0]}>
          <circle cx={X(i)} cy={Y(p[1])} r="6" fill="#1c1d21" stroke="#79a3ff" strokeWidth="3" />
          <text x={X(i)} y={Y(p[1]) - 14} fill="#f5f6f8" fontSize="15" fontWeight="700" textAnchor="middle">{p[1]}</text>
          {(i % every === 0 || i === pts.length - 1) && <text x={X(i)} y={H - 8} fill="#8e919c" fontSize="13" textAnchor="middle">{p[0].slice(8, 10)}/{p[0].slice(5, 7)}</text>}
        </g>
      ))}
    </svg>
  );
}
