'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { saveSession, type Payload } from './actions';
import { studentLogout } from '../login/actions';
import Calendario, { type Dia } from './Calendario';

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

export default function Aluno({ sid, name, notes, workouts, last, lastWorkoutId, sessions, today }: {
  sid: number; name: string; notes: string | null; workouts: Workout[];
  last: Record<string, LastSet[]>; lastWorkoutId: number | null; sessions: Dia[]; today: string;
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
  const [summary, setSummary] = useState<{ sets: number; vol: number; queued: boolean; name: string } | null>(null);
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

  async function finish() {
    if (!W) return;
    const logs: Payload['logs'] = [];
    for (const ex of W.exercises) for (let n = 1; n <= ex.sets; n++) {
      const k = `${ex.id}-${n}`;
      if (prog.done[k] || prog.w[k] || prog.r[k]) logs.push({ we_id: ex.id, set: n, weight: prog.w[k] ?? '', reps: prog.r[k] ?? '' });
    }
    if (!logs.length) { alert('Marque ao menos uma série.'); return; }
    setBusy(true);
    // entra na fila antes de enviar: se falhar, tenta de novo depois sem perder nada
    setQ([...getQ(), { workout_id: W.id, logs, at: new Date().toISOString() }]);
    localStorage.removeItem(wkey(W.id));
    const ok = await flush();
    setEnd(0);
    setSummary({ name: W.name, sets: logs.length, queued: !ok, vol: logs.reduce((a, l) => a + (Number(l.weight) || 0) * (Number(l.reps) || 0), 0) });
  }

  function step(k: string, d: number, placeholder: string) {
    const cur = parseFloat(prog.w[k]) || parseFloat(placeholder) || 0;
    const v = Math.max(0, Math.round((cur + d) * 100) / 100);
    persist({ ...prog, w: { ...prog.w, [k]: v ? String(v) : '' } });
  }

  if (!workouts.length) return <main><p>Nenhum treino cadastrado ainda.</p></main>;
  if (summary) {
    return (
      <main>
        <header><h1>Treino {summary.name} concluído 💪</h1></header>
        <div className="card">
          <p>{summary.sets} séries registradas</p>
          {summary.queued && <p className="note">Sem conexão: o treino ficou salvo no celular e será enviado quando voltar a internet.</p>}
          <p>Volume total: {Math.round(summary.vol)} kg</p>
        </div>
        <button className="big" onClick={() => location.reload()}>Voltar</button>
      </main>
    );
  }
  if (!W || !ready) return <main><p className="muted">Carregando…</p></main>;

  return (
    <main>
      <header><span className="hi">Bom treino</span><h1>Olá, {name}</h1></header>
      {notes && <details className="notes"><summary>Orientações gerais</summary><p>{notes}</p></details>}
      <Calendario sessions={sessions} today={today} />

      <nav className="tabs">
        {workouts.map(w => (
          <button key={w.id} className={w.id === wid ? 'on' : ''} onClick={() => { setWid(w.id); setProg(load(w.id)); }}>
            {w.name}
            {w.id === nextId && <small>próximo</small>}
            {w.id === lastWorkoutId && <small>último</small>}
          </button>
        ))}
      </nav>

      <div className="hero">
        <small>{W.id === nextId ? 'Treino de hoje' : `Treino ${W.name}`}</small>
        <h2>{W.focus || `Treino ${W.name}`}</h2>
        <div className="pills"><span>{W.exercises.length} exercícios</span><span>{W.exercises.reduce((a, x) => a + Number(x.sets), 0)} séries</span></div>
      </div>

      <section>
        {W.exercises.map((ex, idx) => {
          const ls = last[ex.id];
          const top = repsTop(ex.reps);
          const up = !!ls && !!top && ls.length >= ex.sets && ls.every(s => (s.r ?? 0) >= top);
          const v = ex.video_url ? embed(ex.video_url) : null;
          return (
            <article className="card" key={ex.id}>
              <h2><b>{idx + 1}</b> {ex.name}{up && <span className="badge">Subir carga (+1–2 kg)</span>}</h2>
              <p className="meta"><span>{ex.sets} × {ex.reps}</span><span>descanso {ex.rest}</span></p>
              {ex.notes && <p className="note">{ex.notes}</p>}
              {ex.video_url ? (
                videos[ex.id] ? (
                  <div className="vbox">
                    {v?.t === 'video' ? <video src={v.src} controls autoPlay playsInline />
                      : <iframe src={v?.src} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />}
                  </div>
                ) : (
                  <button type="button" className="vid" onClick={() => v ? setVideos({ ...videos, [ex.id]: true }) : window.open(ex.video_url!, '_blank', 'noopener')}>▶ Ver execução</button>
                )
              ) : (
                <a className="yt" target="_blank" rel="noopener" href={`https://www.youtube.com/results?search_query=${encodeURIComponent('execução ' + ex.name)}`}>Buscar execução no YouTube</a>
              )}

              <div className="cols"><span>Série</span><span>Carga (kg)</span><span>Reps</span></div>
              {Array.from({ length: ex.sets }, (_, i) => i + 1).map(n => {
                const k = `${ex.id}-${n}`, prev = ls?.find(s => s.n === n);
                const phW = prev && prev.w !== null ? String(prev.w) : '0';
                return (
                  <div className={`set ${prog.done[k] ? 'ok' : ''}`} key={k}>
                    <label className="chk">
                      <input type="checkbox" aria-label={`Série ${n} feita`} checked={!!prog.done[k]}
                        onChange={e => { persist({ ...prog, done: { ...prog.done, [k]: e.target.checked } }); if (e.target.checked) setEnd(Date.now() + restSecs(ex.rest) * 1000); }} />
                      <span>{n}</span>
                    </label>
                    <div className="load">
                      <button type="button" className="step" aria-label="Diminuir 1 kg" onClick={() => step(k, -1, phW)}>−</button>
                      <input type="text" inputMode="decimal" autoComplete="off" aria-label={`Carga em kg, série ${n}`} placeholder={phW} value={prog.w[k] ?? ''}
                        onChange={e => persist({ ...prog, w: { ...prog.w, [k]: e.target.value.replace(',', '.').replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1').slice(0, 6) } })} />
                      <button type="button" className="step" aria-label="Aumentar 1 kg" onClick={() => step(k, 1, phW)}>+</button>
                    </div>
                    <input type="text" inputMode="numeric" autoComplete="off" className="reps" aria-label={`Repetições, série ${n}`} placeholder={prev && prev.r !== null ? String(prev.r) : '0'}
                      value={prog.r[k] ?? ''} onChange={e => persist({ ...prog, r: { ...prog.r, [k]: e.target.value.replace(/\D/g, '').slice(0, 3) } })} />
                  </div>
                );
              })}
              {ls && <p className="last">Última vez: {ls.map(s => `${s.w ?? '-'} kg × ${s.r ?? '-'}`).join(' · ')}</p>}
            </article>
          );
        })}
      </section>

      <button className="big" onClick={finish} disabled={busy}>Finalizar treino</button>
      <form action={studentLogout} style={{ textAlign: 'center', marginTop: 16 }}><button>Sair</button></form>

      {end > 0 && (
        <div id="timer">
          <span id="tleft">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
          <button id="tplus" type="button" onClick={() => setEnd(e => e + 15000)}>+15 s</button>
          <button id="tskip" type="button" onClick={() => setEnd(0)}>Pular</button>
        </div>
      )}
    </main>
  );
}
