'use client';

import { useState } from 'react';

export type Dia = { d: string; w: string; focus: string | null }; // d = 'YYYY-MM-DD' (horário de Brasília)

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

// datas como UTC puro: evita o fuso do celular mexer no dia
const parse = (s: string) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);
const ym = (s: string) => s.slice(0, 7);

/** Resumo de frequência + calendário mensal com o treino feito em cada dia. */
export default function Calendario({ sessions, today }: { sessions: Dia[]; today: string }) {
  const T = parse(today);
  const [off, setOff] = useState(0); // 0 = mês atual, -1 = anterior…
  const [sel, setSel] = useState<string | null>(null);

  const byDay = new Map<string, Dia[]>();
  for (const s of sessions) (byDay.get(s.d) ?? byDay.set(s.d, []).get(s.d)!).push(s);

  // ---- números ----
  const weekStart = iso(addDays(T, -T.getUTCDay()));
  const lastMonth = iso(new Date(Date.UTC(T.getUTCFullYear(), T.getUTCMonth() - 1, 1)));
  const last28 = iso(addDays(T, -27));
  const count = (f: (d: string) => boolean) => sessions.filter(s => f(s.d)).length;
  const semana = count(d => d >= weekStart && d <= today);
  const mes = count(d => ym(d) === ym(today));
  const mesPassado = count(d => ym(d) === ym(lastMonth));
  const media = count(d => d >= last28 && d <= today) / 4;

  // ---- mês exibido ----
  const M = new Date(Date.UTC(T.getUTCFullYear(), T.getUTCMonth() + off, 1));
  const key = iso(M).slice(0, 7);
  const first = sessions.length ? sessions.reduce((a, s) => (s.d < a ? s.d : a), today) : today;
  const canBack = key > ym(first);
  const start = addDays(M, -M.getUTCDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  while (cells.length > 35 && ym(iso(cells[cells.length - 7])) !== key) cells.splice(-7); // 5 ou 6 semanas
  const doMes = sessions.filter(s => ym(s.d) === key);
  const porTreino = [...doMes.reduce((m, s) => m.set(s.w, (m.get(s.w) ?? 0) + 1), new Map<string, number>())].sort((a, b) => a[0].localeCompare(b[0]));
  const selDia = sel ? byDay.get(sel) : null;

  return (
    <details className="card cal">
      <summary>
        <span>Meu calendário</span>
        <small>{mes} {mes === 1 ? 'treino' : 'treinos'} este mês</small>
      </summary>

      <div className="stats">
        <div><b>{semana}</b><span>esta semana</span></div>
        <div><b>{mes}</b><span>este mês</span>{mesPassado > 0 && <em>{MESES[parse(lastMonth).getUTCMonth()].slice(0, 3)}: {mesPassado}</em>}</div>
        <div><b>{media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b><span>média/semana (4 sem.)</span></div>
        <div><b>{sessions.length}</b><span>no total</span></div>
      </div>

      <div className="cal-nav">
        <button type="button" aria-label="Mês anterior" disabled={!canBack} onClick={() => { setOff(off - 1); setSel(null); }}>‹</button>
        <strong>{MESES[M.getUTCMonth()]} {M.getUTCFullYear()}</strong>
        <button type="button" aria-label="Próximo mês" disabled={off >= 0} onClick={() => { setOff(off + 1); setSel(null); }}>›</button>
      </div>

      <div className="cal-grid" role="grid" aria-label={`Treinos de ${MESES[M.getUTCMonth()]}`}>
        {SEMANA.map((s, i) => <span key={i} className="dow" aria-hidden="true">{s}</span>)}
        {cells.map(c => {
          const d = iso(c), feitos = byDay.get(d), fora = ym(d) !== key;
          return (
            <button type="button" key={d} disabled={fora || !feitos}
              className={['day', feitos && !fora && 'on', fora && 'out', d === today && 'today', d === sel && 'sel'].filter(Boolean).join(' ')}
              aria-label={`${c.getUTCDate()} de ${MESES[c.getUTCMonth()]}${feitos ? `: treino ${feitos.map(f => f.w).join(' e ')}` : ''}`}
              onClick={() => setSel(d === sel ? null : d)}>
              <span>{c.getUTCDate()}</span>
              {feitos && !fora && <i>{feitos.map(f => f.w).join('+')}</i>}
            </button>
          );
        })}
      </div>

      {selDia ? (
        <div className="cal-det">
          <b>{DIAS[parse(sel!).getUTCDay()]}, {sel!.slice(8, 10)}/{sel!.slice(5, 7)}</b>
          {selDia.map((s, i) => <p key={i}>Treino {s.w}{s.focus ? ` · ${s.focus}` : ''}</p>)}
        </div>
      ) : (
        <p className="cal-foot">
          {doMes.length
            ? <>{doMes.length} {doMes.length === 1 ? 'treino' : 'treinos'} em {MESES[M.getUTCMonth()]}: {porTreino.map(([w, n]) => `${w} ×${n}`).join(' · ')}</>
            : 'Nenhum treino registrado neste mês.'}
          {doMes.length > 0 && <small> Toque num dia para ver o detalhe.</small>}
        </p>
      )}
    </details>
  );
}
