'use client';

import { useState } from 'react';
import Icon from '../Icon';
import { Chart } from '../Chart';

export type Ponto = { ex: string; d: string; w: number };
type Serie = { nome: string; pts: [string, number][]; unidade: string };

const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const PESO = 'Peso corporal';

/** Minha evolução: carga máxima por dia em cada exercício (e o peso das avaliações), com recorde e gráfico. */
export default function Evolucao({ evo, pesos }: { evo: Ponto[]; pesos: { d: string; w: number }[] }) {
  // séries por exercício, as treinadas mais recentemente primeiro
  const map = new Map<string, [string, number][]>();
  for (const p of evo) (map.get(p.ex) ?? map.set(p.ex, []).get(p.ex)!).push([p.d, p.w]);
  const series: Serie[] = [...map].map(([nome, pts]) => ({ nome, pts, unidade: 'kg' }))
    .sort((a, b) => b.pts[b.pts.length - 1][0].localeCompare(a.pts[a.pts.length - 1][0]) || a.nome.localeCompare(b.nome));
  if (pesos.length) series.push({ nome: PESO, pts: pesos.map(p => [p.d, p.w]), unidade: 'kg' });

  const [sel, setSel] = useState(series[0]?.nome ?? '');
  const S = series.find(s => s.nome === sel) ?? series[0];
  const recordes = series.filter(s => s.nome !== PESO && s.pts.length > 1 && s.pts[s.pts.length - 1][1] >= Math.max(...s.pts.map(p => p[1])) && s.pts[s.pts.length - 1][1] > s.pts[0][1]).length;

  return (
    <details className="panel cal evo">
      <summary>
        <span className="dot"><Icon name="chart" size={22} /></span>
        <span className="grow"><b>Minha evolução</b>
          <small>{series.length ? `${map.size} ${map.size === 1 ? 'exercício' : 'exercícios'} com carga registrada${recordes ? ` · ${recordes} no recorde` : ''}` : 'Aparece depois do primeiro treino com carga'}</small></span>
        <span className="ibtn sq"><Icon name="right" size={16} /></span>
      </summary>

      {!S ? (
        <p className="muted">Registre a carga das séries e finalize o treino. Aqui você vai ver quanto sua carga subiu em cada exercício.</p>
      ) : (
        <>
          <div className="chips evo-chips" role="group" aria-label="Escolher exercício">
            {series.map(s => (
              <button type="button" key={s.nome} className={`chip sm ${s.nome === S.nome ? 'on' : ''}`} aria-pressed={s.nome === S.nome} onClick={() => setSel(s.nome)}>{s.nome}</button>
            ))}
          </div>
          <Detalhe s={S} />
        </>
      )}
    </details>
  );
}

function Detalhe({ s }: { s: Serie }) {
  const pts = s.pts.slice(-12); // gráfico: últimas 12 marcações
  const ultimo = s.pts[s.pts.length - 1], primeiro = s.pts[0];
  const max = s.pts.reduce((a, p) => (p[1] > a[1] ? p : a), s.pts[0]);
  const dif = Math.round((ultimo[1] - primeiro[1]) * 10) / 10;
  const peso = s.nome === PESO;
  return (
    <div className="evo-d">
      <p className="big">{fmt(ultimo[1])}<small> {s.unidade} {peso ? 'na última avaliação' : 'na última vez'} ({dm(ultimo[0])})</small></p>
      <div className="trio">
        <div><span>{peso ? 'Menor' : 'Recorde'}</span><b>{fmt(peso ? Math.min(...s.pts.map(p => p[1])) : max[1])} kg</b></div>
        <div><span>Primeira vez</span><b>{fmt(primeiro[1])} kg</b></div>
        <div><span>Diferença</span><b>{s.pts.length > 1 ? `${dif > 0 ? '+' : dif < 0 ? '−' : ''}${fmt(Math.abs(dif))} kg` : '—'}</b></div>
      </div>
      {pts.length > 1
        ? <Chart pts={pts} unit={s.unidade} label={peso ? 'Evolução do peso' : `Evolução da carga em ${s.nome}`} />
        : <p className="muted evo-hint">Faça este exercício mais vezes para ver o gráfico da sua evolução.</p>}
    </div>
  );
}
