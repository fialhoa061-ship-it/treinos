'use client';

import { useEffect, useRef, useState } from 'react';

export function ConfirmButton({ confirm: msg, className, children }: { confirm?: string; className?: string; children: React.ReactNode }) {
  return <button className={className} onClick={e => { if (msg && !window.confirm(msg)) e.preventDefault(); }}>{children}</button>;
}

export function AccessCode({ code, name }: { code: string | null; name: string }) {
  const [site, setSite] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => setSite(location.origin), []);
  if (!code) return <p className="muted">Este aluno ainda não tem código de acesso. Gere um abaixo.</p>;
  const msg = `Oi, ${name}! Seu treino está pronto. Acesse ${site}/login, toque em "Aluno" e digite o código ${code}.`;
  return (
    <>
      <p className="muted" style={{ margin: 0 }}>Código de acesso do aluno</p>
      <p style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '.3em', margin: '4px 0 12px' }} aria-label={`Código ${code.split('').join(' ')}`}>{code}</p>
      <div className="row">
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(code); setDone(true); }}>{done ? 'Copiado ✓' : 'Copiar código'}</button>
        <a className="btn" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(msg)}`}>Enviar no WhatsApp</a>
      </div>
    </>
  );
}

type Lib = { name: string; video_url: string | null; notes: string | null };
type Ex = { id?: number; name?: string; sets?: number; reps?: string; rest?: string; notes?: string | null; video_url?: string | null };

/** Formulário de exercício; no modo "novo" permite preencher a partir da biblioteca. */
export function ExerciseForm({ action, workoutId, ex = {}, library, label }: {
  action: (f: FormData) => Promise<void>; workoutId: number; ex?: Ex; library?: Lib[]; label: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  function pick(i: string) {
    const l = library?.[Number(i)];
    const f = ref.current;
    if (!l || !f) return;
    (f.elements.namedItem('name') as HTMLInputElement).value = l.name;
    (f.elements.namedItem('video_url') as HTMLInputElement).value = l.video_url ?? '';
    (f.elements.namedItem('notes') as HTMLTextAreaElement).value = l.notes ?? '';
  }
  return (
    <form action={action} ref={ref}>
      <input type="hidden" name="id" value={ex.id ?? 0} />
      <input type="hidden" name="workout_id" value={workoutId} />
      {library && (
        <label>Da biblioteca
          <select defaultValue="" onChange={e => pick(e.target.value)}>
            <option value="">— escolher (preenche o formulário) —</option>
            {library.map((l, i) => <option key={l.name} value={i}>{l.name}</option>)}
          </select>
        </label>
      )}
      <label>Nome <input name="name" required defaultValue={ex.name} /></label>
      <div className="row">
        <label>Séries <input name="sets" type="number" min={1} max={20} defaultValue={ex.sets ?? 3} /></label>
        <label>Repetições <input name="reps" defaultValue={ex.reps ?? '10'} /></label>
        <label>Descanso <input name="rest" defaultValue={ex.rest ?? '90 s'} /></label>
      </div>
      <label>Observações <textarea name="notes" rows={2} defaultValue={ex.notes ?? ''} /></label>
      <label>URL do vídeo <input name="video_url" defaultValue={ex.video_url ?? ''} /></label>
      <button>{label}</button>
    </form>
  );
}

/** Gráfico de linha simples (maior carga por sessão). */
export function Chart({ pts }: { pts: [string, number][] }) {
  const W = 600, H = 200, P = 30;
  const ys = pts.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const X = (i: number) => (pts.length > 1 ? P + (i * (W - 2 * P)) / (pts.length - 1) : W / 2);
  const Y = (v: number) => H - P - ((v - lo) / span) * (H - 2 * P);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolução da carga">
      <polyline fill="none" stroke="#1a7bff" strokeWidth="3" points={pts.map((p, i) => `${X(i)},${Y(p[1])}`).join(' ')} />
      {pts.map((p, i) => (
        <g key={p[0]}>
          <circle cx={X(i)} cy={Y(p[1])} r="4" fill="#c6f432" />
          <text x={X(i)} y={Y(p[1]) - 8} fill="#f4f6ff" fontSize="11" textAnchor="middle">{p[1]}</text>
          <text x={X(i)} y={H - 8} fill="#9aa3b8" fontSize="10" textAnchor="middle">{p[0].slice(8, 10)}/{p[0].slice(5, 7)}</text>
        </g>
      ))}
    </svg>
  );
}
