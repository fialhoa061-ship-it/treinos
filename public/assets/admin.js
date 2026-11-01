// copiar link
document.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
  const i = document.querySelector(b.dataset.copy);
  try { await navigator.clipboard.writeText(i.value); } catch { i.select(); document.execCommand('copy'); }
  b.textContent = 'Copiado ✓';
});

// biblioteca -> preenche formulário de novo exercício
document.querySelectorAll('.libpick').forEach(s => s.onchange = () => {
  if (!s.value) return;
  const l = JSON.parse(s.value), f = s.closest('form');
  f.name.value = l.name; f.video_url.value = l.video_url || ''; f.notes.value = l.notes || '';
});

// gráfico de linha simples (maior carga por sessão)
document.querySelectorAll('svg.chart').forEach(svg => {
  const pts = JSON.parse(svg.dataset.pts), W = 600, H = 200, P = 30;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const ys = pts.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const X = i => pts.length > 1 ? P + i * (W - 2 * P) / (pts.length - 1) : W / 2;
  const Y = v => H - P - (v - lo) / span * (H - 2 * P);
  let h = `<polyline fill="none" stroke="#3b82f6" stroke-width="3" points="${pts.map((p, i) => X(i) + ',' + Y(p[1])).join(' ')}"/>`;
  pts.forEach((p, i) => {
    h += `<circle cx="${X(i)}" cy="${Y(p[1])}" r="4" fill="#3b82f6"/><text x="${X(i)}" y="${Y(p[1]) - 8}" fill="#e8eaee" font-size="11" text-anchor="middle">${p[1]}</text>`;
    h += `<text x="${X(i)}" y="${H - 8}" fill="#8b93a1" font-size="10" text-anchor="middle">${p[0].slice(8, 10)}/${p[0].slice(5, 7)}</text>`;
  });
  svg.innerHTML = h;
});
