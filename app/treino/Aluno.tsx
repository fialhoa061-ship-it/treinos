'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { saveSession, type Feedback, type Payload } from './actions';
import { ALERTAS, ESFORCO, type Alerta } from '@/lib/util';
import { studentLogout } from '../login/actions';
import Calendario, { type Dia } from './Calendario';
import Evolucao, { type Ponto } from './Evolucao';
import MeusDados from './MeusDados';
import Icon from '../Icon';

type Ex = { id: number; name: string; sets: number; reps: string; rest: string; notes: string | null; video_url: string | null };
type Workout = { id: number; name: string; focus: string | null; exercises: Ex[] };
type LastSet = { n: number; w: number | null; r: number | null };
type Prog = { done: Record<string, boolean>; w: Record<string, string>; r: Record<string, string> };

const emptyProg = (): Prog => ({ done: {}, w: {}, r: {} });

function embed(url: string): { t: 'iframe' | 'video'; src: string } | null {
  let m: RegExpMatchArray | null;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/))) return { t: 'iframe', src: `https://www.youtube.com/embed/${m[1]}?autoplay=1` };
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return { t: 'iframe', src: `https://player.vimeo.com/video/${m[1]}?autoplay=1` };
  if (/\.mp4(\?|$)/i.test(url)) return { t: 'video', src: url };
  return null;
}

// topo da faixa: "8–10" -> 10, "10 cada perna" -> 10
function repsTop(r: string): number | null {
  const n = (r.match(/\d+/g) ?? []).map(Number);
  return n.length ? Math.max(n[0], n[1] ?? 0) : null;
}

// "2–3 min" -> 120, "90 s" -> 90, padrão 90
function restSecs(txt: string): number {
  const m = txt.match(/\d+/);
  return m ? Number(m[0]) * (/min/i.test(txt) ? 60 : 1) : 90;
}

function beep() {
  try {
    const A = window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const a = new A(), o = a.createOscillator();
    o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.4);
  } catch { /* sem áudio */ }
}

export default function Aluno({ sid, name, notes, workouts, last, lastWorkoutId, sessions, today, evo = [], pesos = [], exclusaoPedida = false }: {
  sid: number; name: string; notes: string | null; workouts: Workout[];
  last: Record<string, LastSet[]>; lastWorkoutId: number | null; sessions: Dia[]; today: string;
  evo?: Ponto[]; pesos?: { d: string; w: number }[]; exclusaoPedida?: boolean;
}) {
  const pkey = `pend:${sid}`;
  const wkey = (id: number) => `treino:${sid}:${id}`;

  const nextId = workouts.length ? workouts[(workouts.findIndex(w => w.id === lastWorkoutId) + 1) % workouts.length].id : 0;
  const [wid, setWid] = useState(nextId);
  const [prog, setProg] = useState<Prog>(emptyProg);
  const [ready, setReady] = useState(false);
  const [videos, setVideos] = useState<Record<number, boolean>>({});
  const [end, setEnd] = useState(0);
  const [left, setLeft] = useState(0);
  const [summary, setSummary] = useState<{ sets: number; vol: number; queued: boolean; name: string; effort: number | null } | null>(null);
  const [ask, setAsk] = useState(false);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const flushing = useRef(false);

  const W = workouts.find(w => w.id === wid);

  const load = useCallback((id: number): Prog => {
    try { return { ...emptyProg(), ...JSON.parse(localStorage.getItem(wkey(id)) ?? '{}') }; } catch { return emptyProg(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  // abre no treino com progresso salvo; senão no próximo da fila
  useEffect(() => {
    const saved = workouts.find(w => localStorage.getItem(wkey(w.id)));
    const id = saved?.id ?? nextId;
    setWid(id); setProg(load(id)); setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (p: Prog) => { setProg(p); localStorage.setItem(wkey(wid), JSON.stringify(p)); };

  // ---- timer ----
  useEffect(() => {
    if (!end) return;
    const tick = () => {
      const s = Math.ceil((end - Date.now()) / 1000);
      if (s <= 0) { setEnd(0); setLeft(0); beep(); navigator.vibrate?.([300, 150, 300]); } else setLeft(s);
    };
    tick();
    const i = setInterval(tick, 250);
    return () => clearInterval(i);
  }, [end]);

  // ---- fila de envio (offline) ----
  const getQ = (): Payload[] => { try { return JSON.parse(localStorage.getItem(pkey) ?? '[]'); } catch { return []; } };
  const setQ = (q: Payload[]) => (q.length ? localStorage.setItem(pkey, JSON.stringify(q)) : localStorage.removeItem(pkey));
  const flush = useCallback(async (): Promise<boolean> => {
    if (flushing.current) return false;
    flushing.current = true;
    try {
      const q = getQ();
      while (q.length) {
        const r = await saveSession(q[0]);
        if (r.expired) return false; // sessão expirou: mantém na fila até logar de novo
        // ok:false por dado inválido sai da fila: não trava
        q.shift(); setQ(q);
      }
      return true;
    } catch { return false; } finally { flushing.current = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);
  useEffect(() => {
    flush();
    addEventListener('online', flush);
    return () => removeEventListener('online', flush);
  }, [flush]);

  // conexão: aviso discreto quando cair; o treino continua salvo no celular
  useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    addEventListener('online', up); addEventListener('offline', up);
    return () => { removeEventListener('online', up); removeEventListener('offline', up); };
  }, []);

  // app offline: guarda esta página e os arquivos do app no celular (public/sw.js)
  useEffect(() => { if (process.env.NODE_ENV === 'production') navigator.serviceWorker?.register('/sw.js').catch(() => {}); }, []);

  function collect(): Payload['logs'] {
    const logs: Payload['logs'] = [];
    if (W) for (const ex of W.exercises) for (let n = 1; n <= ex.sets; n++) {
      const k = `${ex.id}-${n}`;
      if (prog.done[k] || prog.w[k] || prog.r[k]) logs.push({ we_id: ex.id, set: n, weight: prog.w[k] ?? '', reps: prog.r[k] ?? '' });
    }
    return logs;
  }

  // "Finalizar treino" abre o retorno (esforço e sintomas); o envio acontece ao confirmar
  function finish() {
    if (!collect().length) { alert('Marque ao menos uma série.'); return; }
    setEnd(0);
    setAsk(true);
  }

  async function send(feedback: Feedback) {
    if (!W) return;
    const logs = collect();
    setBusy(true);
    // entra na fila antes de enviar: se falhar, tenta de novo depois sem perder nada
    setQ([...getQ(), { workout_id: W.id, logs, at: new Date().toISOString(), feedback }]);
    localStorage.removeItem(wkey(W.id));
    const ok = await flush();
    setAsk(false);
    setSummary({ name: W.name, sets: logs.length, queued: !ok, effort: feedback.effort ?? null,
      vol: logs.reduce((a, l) => a + (Number(l.weight) || 0) * (Number(l.reps) || 0), 0) });
  }

  function step(k: string, d: number, placeholder: string) {
    const cur = parseFloat(prog.w[k]) || parseFloat(placeholder) || 0;
    const v = Math.max(0, Math.round((cur + d) * 100) / 100);
    persist({ ...prog, w: { ...prog.w, [k]: v ? String(v) : '' } });
  }

  const first = name.trim().split(/\s+/)[0] || name;
  const ini = name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();

  if (!workouts.length) {
    return (
      <main className="screen">
        <Header first={first} ini={ini} sub="Seu treino ainda está sendo montado" />
        <div className="panel empty">
          <span className="dot"><Icon name="dumbbell" size={28} /></span>
          <h2>Nenhum treino ainda</h2>
          <p>Assim que o seu professor cadastrar os treinos, eles aparecem aqui.</p>
        </div>
        <MeusDados exclusaoPedida={exclusaoPedida} />
      </main>
    );
  }
  if (!W || !ready) return <main className="screen"><p className="muted" role="status">Carregando…</p></main>;

  const total = W.exercises.reduce((a, x) => a + Number(x.sets), 0);
  const feitas = W.exercises.reduce((a, x) => a + Array.from({ length: x.sets }, (_, i) => prog.done[`${x.id}-${i + 1}`]).filter(Boolean).length, 0);
  const pct = total ? Math.round((feitas / total) * 100) : 0;

  return (
    <>
    <main className="screen" inert={!!summary || ask}>
      <Header first={first} ini={ini} sub={feitas ? 'Bora terminar esse treino' : 'Vamos começar o treino de hoje'} />
      {!online && <p className="offline" role="status"><Icon name="info" size={18} />Sem internet. Pode treinar normalmente: tudo fica salvo no celular e é enviado quando a conexão voltar.</p>}

      <section className="panel today" aria-label="Progresso do treino">
        <div className="label">
          <h2>{W.id === nextId ? 'Treino de hoje' : `Treino ${W.name}`}</h2>
          {W.id === lastWorkoutId && <span className="tag">feito por último</span>}
        </div>
        <div className="meter">
          <p className="big">{feitas}<small> / {total} séries</small></p>
          <div className="bar-w">
            <span>{pct}%</span>
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Séries feitas"><i style={{ "--p": `${pct}%` } as React.CSSProperties} /></div>
          </div>
        </div>
      </section>

      <nav className="chips" aria-label="Treinos">
        {workouts.map(w => (
          <button key={w.id} type="button" className={`chip ${w.id === wid ? 'on' : ''}`} aria-pressed={w.id === wid} onClick={() => { setWid(w.id); setProg(load(w.id)); }}>
            Treino {w.name}
          </button>
        ))}
      </nav>

      <section className="panel wk">
        <h2>{W.focus || `Treino ${W.name}`}</h2>
        <div className="trio">
          <div><span>Exercícios</span><b>{W.exercises.length}</b></div>
          <div><span>Séries</span><b>{total}</b></div>
          <div><span>Concluído</span><b>{pct}%</b></div>
        </div>
        {notes && (
          <details>
            <summary className="opt"><span>Orientações do professor</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
            <p>{notes}</p>
          </details>
        )}
      </section>

      <Calendario sessions={sessions} today={today} />
      <Evolucao evo={evo} pesos={pesos} />

      <div className="section-t"><h2>Exercícios</h2><span>{W.exercises.length} · {total} séries</span></div>

      {W.exercises.map((ex, idx) => {
        const ls = last[ex.id];
        const top = repsTop(ex.reps);
        const up = !!ls && !!top && ls.length >= ex.sets && ls.every(s => (s.r ?? 0) >= top);
        const v = ex.video_url ? embed(ex.video_url) : null;
        const exDone = Array.from({ length: ex.sets }, (_, i) => prog.done[`${ex.id}-${i + 1}`]).every(Boolean);
        return (
          <article className="panel tight ex" key={ex.id}>
            <div className="ex-h">
              <span className={`num ${exDone ? 'ok' : ''}`}>{exDone ? <Icon name="check" size={22} /> : idx + 1}</span>
              <div className="grow">
                <h3>{ex.name}</h3>
                <div className="tags"><span className="tag blue">{ex.sets} × {ex.reps}</span><span className="tag"><Icon name="clock" size={14} />{ex.rest}</span></div>
              </div>
            </div>
            {up && <p className="up"><Icon name="chart" size={18} />Hora de subir a carga: +1 a 2 kg</p>}
            {ex.notes && <p className="note">{ex.notes}</p>}

            {ex.video_url && videos[ex.id] ? (
              <div className="vbox">
                {v?.t === 'video' ? <video src={v.src} controls autoPlay playsInline />
                  : <iframe src={v?.src} title={`Execução: ${ex.name}`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />}
              </div>
            ) : ex.video_url ? (
              <button type="button" className="media" onClick={() => v ? setVideos({ ...videos, [ex.id]: true }) : window.open(ex.video_url!, '_blank', 'noopener')}>
                <span className="dot"><Icon name="play" size={18} /></span><span className="grow">{v ? 'Ver execução' : 'Ver vídeos de execução no YouTube'}</span><span className="ibtn sq"><Icon name="right" size={16} /></span>
              </button>
            ) : (
              <a className="media" target="_blank" rel="noopener" href={`https://www.youtube.com/results?search_query=${encodeURIComponent('execução ' + ex.name)}`}>
                <span className="dot"><Icon name="search" size={18} /></span><span className="grow">Buscar execução no YouTube</span><span className="ibtn sq"><Icon name="right" size={16} /></span>
              </a>
            )}

            <div className="sets">
              <div className="cols" aria-hidden="true"><span>Série</span><span>Carga (kg)</span><span>Reps</span></div>
              {Array.from({ length: ex.sets }, (_, i) => i + 1).map(n => {
                const k = `${ex.id}-${n}`, prev = ls?.find(s => s.n === n);
                const phW = prev && prev.w !== null ? String(prev.w) : '0';
                return (
                  <div className={`set ${prog.done[k] ? 'ok' : ''}`} key={k}>
                    <label className="chk">
                      <input type="checkbox" aria-label={`Série ${n} feita`} checked={!!prog.done[k]}
                        onChange={e => {
                          const on = e.target.checked;
                          // ao marcar, assume a carga/reps mostradas (da última vez) se o aluno não digitou: o registro bate com a tela
                          const w = on && !prog.w[k] && prev?.w != null ? { ...prog.w, [k]: String(prev.w) } : prog.w;
                          const r = on && !prog.r[k] && prev?.r != null ? { ...prog.r, [k]: String(prev.r) } : prog.r;
                          persist({ done: { ...prog.done, [k]: on }, w, r });
                          if (on) setEnd(Date.now() + restSecs(ex.rest) * 1000);
                        }} />
                      <span><b>{n}</b><Icon name="check" size={22} /></span>
                    </label>
                    <div className="load">
                      <button type="button" className="step" aria-label="Diminuir 1 kg" onClick={() => step(k, -1, phW)}><Icon name="minus" size={18} /></button>
                      <input type="text" inputMode="decimal" autoComplete="off" aria-label={`Carga em kg, série ${n}`} placeholder={phW} value={prog.w[k] ?? ''}
                        onChange={e => persist({ ...prog, w: { ...prog.w, [k]: e.target.value.replace(',', '.').replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1').slice(0, 6) } })} />
                      <button type="button" className="step" aria-label="Aumentar 1 kg" onClick={() => step(k, 1, phW)}><Icon name="plus" size={18} /></button>
                    </div>
                    <input type="text" inputMode="numeric" autoComplete="off" className="reps" aria-label={`Repetições, série ${n}`} placeholder={prev && prev.r !== null ? String(prev.r) : '0'}
                      value={prog.r[k] ?? ''} onChange={e => persist({ ...prog, r: { ...prog.r, [k]: e.target.value.replace(/\D/g, '').slice(0, 3) } })} />
                  </div>
                );
              })}
            </div>
            {ls && <p className="last"><Icon name="clock" size={16} /><span>Última vez: {ls.map(s => `${s.w ?? '–'} kg × ${s.r ?? '–'}`).join(' · ')}</span></p>}
          </article>
        );
      })}

      <button className="btn primary block" onClick={finish} disabled={busy}>{busy ? 'Enviando…' : <><Icon name="check" size={20} />Finalizar treino</>}</button>

      <MeusDados exclusaoPedida={exclusaoPedida} />

      {end > 0 && (
        <div id="timer" role="timer" aria-live="off">
          <span className="t"><small>Descanso</small><span id="tleft">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span></span>
          <button className="btn primary" type="button" onClick={() => setEnd(e => e + 15000)}>+15 s</button>
          <button className="btn" type="button" onClick={() => setEnd(0)}>Pular</button>
        </div>
      )}
    </main>
    {ask && !summary && <Retorno busy={busy} onSend={send} onCancel={() => setAsk(false)} />}
    {summary && <Concluido {...summary} />}
    </>
  );
}

function Header({ first, ini, sub }: { first: string; ini: string; sub: string }) {
  return (
    <header className="top">
      <span className="avatar on" aria-hidden="true">{ini}</span>
      <div className="grow"><h1>Olá, {first}!</h1><p>{sub}</p></div>
      <form action={studentLogout} onSubmit={limparCopia}><button className="ibtn" aria-label="Sair" title="Sair"><Icon name="logout" /></button></form>
    </header>
  );
}

/** Tela de treino concluído: o treino fica desfocado ao fundo e um card central celebra. */
function Concluido({ name, sets, vol, queued, effort }: { name: string; sets: number; vol: number; queued: boolean; effort: number | null }) {
  const kg = Math.round(vol);
  const fechar = () => location.reload();
  const frequencia = () => { location.hash = 'frequencia'; location.reload(); };
  return (
    <div className="finish" role="dialog" aria-modal="true" aria-labelledby="fin-t" aria-describedby="fin-d">
      <div className="finish-mid">
        <div className="finish-card">
          <div className="seal2" aria-hidden="true">
            <svg className="confetti" viewBox="0 0 220 220">
              <path className="c c1" d="M52 46l5 5-5 5-5-5z" />
              <path className="c c2" d="M168 52l2.5 6.5L177 61l-6.5 2.5L168 70l-2.5-6.5L159 61l6.5-2.5z" />
              <path className="c c3 dash" d="M30 92l16-5" />
              <circle className="c c4" cx="36" cy="132" r="3.5" />
              <path className="c c5" d="M181 132l4.5 4.5-4.5 4.5-4.5-4.5z" />
              <path className="c c6 dash" d="M168 176l14 6" />
              <circle className="c c7" cx="70" cy="184" r="3.5" />
              <path className="c c8" d="M116 182l3 7.5 7.5 3-7.5 3-3 7.5-3-7.5-7.5-3 7.5-3z" />
              <path className="c c9 dash" d="M112 20l-2 14" />
              <circle className="c c10" cx="192" cy="98" r="2.5" />
            </svg>
            <span className="seal2-core">
              <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path className="tick" d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          </div>
          <h1 id="fin-t">Treino {name} concluído</h1>
          <p id="fin-d">
            {sets} {sets === 1 ? 'série registrada' : 'séries registradas'}{kg > 0 && <> · {kg.toLocaleString('pt-BR')} kg levantados</>}{effort != null && <> · esforço {effort}/10</>}
          </p>
          {queued && <p className="finish-q"><Icon name="clock" size={16} />Envio quando a internet voltar</p>}
        </div>
      </div>
      <div className="finish-foot">
        <button type="button" className="link" onClick={frequencia}>Ver minha frequência</button>
        <button type="button" className="btn block finish-close" autoFocus onClick={fechar}>Fechar</button>
      </div>
    </div>
  );
}

/** Retorno ao finalizar: esforço percebido (0–10) e sintomas. Dois toques para enviar; tudo opcional. */
function Retorno({ busy, onSend, onCancel }: { busy: boolean; onSend: (f: Feedback) => void; onCancel: () => void }) {
  const [effort, setEffort] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<Alerta[]>([]);
  const [comment, setComment] = useState('');
  const toggle = (a: Alerta) => setAlerts(l => (l.includes(a) ? l.filter(x => x !== a) : [...l, a]));
  const sintomas = alerts.length > 0;
  return (
    <div className="finish fb" role="dialog" aria-modal="true" aria-labelledby="fb-t">
      <div className="fb-sheet">
        <div className="fb-h">
          <h1 id="fb-t">Como foi o treino?</h1>
          <button type="button" className="ibtn" aria-label="Voltar ao treino" onClick={onCancel} disabled={busy}><Icon name="left" /></button>
        </div>

        <fieldset className="fb-q">
          <legend>Esforço do treino <small>0 = repouso · 10 = máximo</small></legend>
          <div className="fb-scale" role="radiogroup" aria-label="Esforço de 0 a 10">
            {ESFORCO.map((_, n) => (
              <button type="button" key={n} role="radio" aria-checked={effort === n} aria-label={`${n}: ${ESFORCO[n]}`}
                className={effort === n ? 'on' : ''} onClick={() => setEffort(effort === n ? null : n)}>{n}</button>
            ))}
          </div>
          <p className="fb-hint" aria-live="polite">{effort == null ? 'Toque no número que mais combina com o treino de hoje.' : `${effort} · ${ESFORCO[effort]}`}</p>
        </fieldset>

        <fieldset className="fb-q">
          <legend>Sentiu algo durante o treino?</legend>
          <div className="fb-chips">
            <button type="button" className={`chip sm ${!sintomas ? 'on' : ''}`} aria-pressed={!sintomas} onClick={() => setAlerts([])}>Tudo bem</button>
            {(Object.keys(ALERTAS) as Alerta[]).map(a => (
              <button type="button" key={a} className={`chip sm warn ${alerts.includes(a) ? 'on' : ''}`} aria-pressed={alerts.includes(a)} onClick={() => toggle(a)}>{ALERTAS[a]}</button>
            ))}
          </div>
          {sintomas && (
            <>
              <label className="field fb-c"><span>Conte como foi (opcional)</span>
                <textarea rows={2} maxLength={500} value={comment} onChange={e => setComment(e.target.value)} placeholder="Ex.: dor no joelho direito no agachamento" />
              </label>
              <p className="fb-warn"><Icon name="info" size={16} />Seu professor vai ver este aviso. Se os sintomas forem fortes ou não passarem, procure atendimento médico.</p>
            </>
          )}
        </fieldset>

        <button type="button" className="btn primary block" disabled={busy} onClick={() => onSend({ effort, alerts, comment: sintomas ? comment : '' })}>
          {busy ? 'Enviando…' : <><Icon name="check" size={20} />Enviar treino</>}
        </button>
        <button type="button" className="link fb-skip" disabled={busy} onClick={() => onSend({})}>Pular e enviar sem responder</button>
      </div>
    </div>
  );
}

/** Ao sair, apaga a cópia offline do treino deste aluno (celular compartilhado). */
function limparCopia() {
  try {
    caches.keys().then(ks => ks.filter(k => k.startsWith('treino-pages')).forEach(k => caches.delete(k)));
    navigator.serviceWorker?.controller?.postMessage('clear-pages');
  } catch { /* sem cache API */ }
}
