// Gráfico de linha compartilhado (professor: histórico de cargas e avaliações; aluno: minha evolução).
/** Gráfico de linha (maior carga por sessão), em azul sobre grafite. */
export function Chart({ pts, unit = 'kg', label = 'Evolução da carga' }: { pts: [string, number][]; unit?: string; label?: string }) {
  const W = 600, H = 220, PX = 34, PT = 34, PB = 34;
  const ys = pts.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const X = (i: number) => (pts.length > 1 ? PX + (i * (W - 2 * PX)) / (pts.length - 1) : W / 2);
  const Y = (v: number) => H - PB - ((v - lo) / span) * (H - PT - PB);
  const line = pts.map((p, i) => `${X(i)},${Y(p[1])}`).join(' ');
  const every = Math.ceil(pts.length / 8); // no máximo ~8 rótulos de data
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: de ${pts[0]?.[1]} a ${pts.at(-1)?.[1]} ${unit}`}>
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
