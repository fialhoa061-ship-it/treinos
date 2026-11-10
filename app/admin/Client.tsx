'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from '../Icon';

/** Barra de abas inferior do professor, com o + central para novo aluno. */
export function TabBar() {
  const path = usePathname();
  const tab = (href: string, label: string, icon: IconName, match: (p: string) => boolean) => (
    <Link href={href} aria-current={match(path) ? 'page' : undefined}><Icon name={icon} size={24} />{label}</Link>
  );
  return (
    <div className="tabbar">
      <nav aria-label="Navegação">
        {tab('/admin', 'Início', 'home', p => p === '/admin')}
        {tab('/admin/alunos', 'Alunos', 'users', p => p.startsWith('/admin/alunos') || p.startsWith('/admin/historico'))}
        <Link href="/admin/novo" className="fab" aria-label="Novo aluno" aria-current={path === '/admin/novo' ? 'page' : undefined}><Icon name="plus" size={28} /></Link>
        {tab('/admin/biblioteca', 'Biblioteca', 'book', p => p.startsWith('/admin/biblioteca') || p.startsWith('/admin/modelos'))}
        {tab('/admin/perfil', 'Perfil', 'user', p => ['/admin/perfil', '/admin/conta', '/admin/backup', '/admin/professores'].some(r => p.startsWith(r)))}
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

type Lib = { name: string; video_url: string | null; notes: string | null; category?: string | null };
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

/** Seletor da biblioteca: busca + filtro por categoria + lista agrupada; ao escolher, preenche o formulário. */
function LibraryPicker({ library, onPick }: { library: Lib[]; onPick: (l: Lib) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Lib | null>(null);
  const cats = [...new Set(library.map(l => l.category || 'Sem categoria'))];
  const nq = norm(q.trim());
  const list = library.filter(l => (!cat || (l.category || 'Sem categoria') === cat) && (!nq || norm(`${l.name} ${l.category ?? ''}`).includes(nq)));
  const groups = new Map<string, Lib[]>();
  for (const l of list) { const k = l.category || 'Sem categoria'; (groups.get(k) ?? groups.set(k, []).get(k)!).push(l); }
  const choose = (l: Lib) => { onPick(l); setPicked(l); setOpen(false); setQ(''); };

  if (picked) {
    return (
      <div className="picked">
        <span className="dot"><Icon name="check" size={18} /></span>
        <span className="grow"><small>Da biblioteca{picked.category ? ` · ${picked.category}` : ''}</small><b>{picked.name}</b></span>
        <button type="button" className="btn sm" onClick={() => { setPicked(null); setOpen(true); }}>Trocar</button>
      </div>
    );
  }
  return (
    <div className="picker">
      <button type="button" className="picker-h" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="dot"><Icon name="book" size={18} /></span>
        <span className="grow"><b>Escolher da biblioteca</b><small>{library.length} exercícios · {cats.length} categorias</small></span>
        <span className="ibtn sq"><Icon name={open ? 'up' : 'down'} size={16} /></span>
      </button>
      {open && (
        <div className="picker-b">
          <label className="search">
            <Icon name="search" size={18} />
            <input type="search" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar exercício ou categoria" aria-label="Buscar na biblioteca"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (list[0]) choose(list[0]); } if (e.key === 'Escape') setOpen(false); }} />
          </label>
          {cats.length > 1 && (
            <div className="picker-cats" role="group" aria-label="Filtrar por categoria">
              <button type="button" className={`chip sm ${!cat ? 'on' : ''}`} aria-pressed={!cat} onClick={() => setCat('')}>Todas</button>
              {cats.map(c => <button type="button" key={c} className={`chip sm ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(cat === c ? '' : c)}>{c}</button>)}
            </div>
          )}
          <div className="picker-l" aria-label="Exercícios da biblioteca">
            {[...groups].map(([g, items]) => (
              <div key={g} className="picker-g">
                <p className="picker-gh">{g} <span>{items.length}</span></p>
                <ul>
                  {items.map(l => (
                    <li key={l.name}>
                      <button type="button" onClick={() => choose(l)}>
                        <span className="grow">{l.name}</span>
                        {l.video_url && !l.video_url.includes('youtube.com/results') &&<span className="has"><Icon name="play" size={14} />vídeo</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!list.length && <p className="none">Nenhum exercício encontrado{q ? ` para “${q}”` : ''}. Preencha o nome abaixo.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Página da biblioteca: busca e filtro por categoria sobre a lista agrupada (renderizada no servidor). */
export function LibrarySearch({ cats, children }: { cats: [string, number][]; children: React.ReactNode }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [shown, setShown] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const nq = norm(q.trim());
    let total = 0;
    el.querySelectorAll<HTMLElement>('.lib-group').forEach(g => {
      let n = 0;
      g.querySelectorAll<HTMLElement>('.exr').forEach(x => {
        const ok = (!cat || g.dataset.cat === cat) && (!nq || norm(x.dataset.name ?? '').includes(nq));
        x.hidden = !ok; if (ok) n++;
      });
      g.hidden = n === 0; total += n;
    });
    setShown(q || cat ? total : null);
  }, [q, cat]);
  return (
    <>
      <div className="lib-tools">
        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar exercício ou categoria" aria-label="Buscar na biblioteca" />
        </label>
        <div className="chips" role="group" aria-label="Filtrar por categoria">
          <button type="button" className={`chip sm ${!cat ? 'on' : ''}`} aria-pressed={!cat} onClick={() => setCat('')}>Todas</button>
          {cats.map(([c, n]) => <button type="button" key={c} className={`chip sm ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(cat === c ? '' : c)}>{c} <small>{n}</small></button>)}
        </div>
        {shown !== null && <p className="muted" role="status" style={{ fontSize: '.88rem', paddingLeft: 4 }}>{shown ? `${shown} ${shown === 1 ? 'exercício encontrado' : 'exercícios encontrados'}` : 'Nenhum exercício encontrado.'}</p>}
      </div>
      <div ref={box} className="lib-groups">{children}</div>
    </>
  );
}

export { Chart } from '../Chart';
