'use client';

import { useEffect, useRef } from 'react';

/**
 * Abertura animada (3,1 s), dirigida por tempo (rAF) com curvas de easing.
 *  0,0–0,5  o N da logo surge; o nome é digitado letra por letra à direita dele
 *  0,5–1,5  pausa; o N "respira" (1,00 → 1,04 → 1,00)
 *  1,5–2,1  letras apagam da direita p/ esquerda; o N desliza ao centro
 *  2,1–2,7  o N cresce (ease-in), ganha brilho e se dissolve
 *  2,7–3,1  fade do fundo escuro para a tela real
 * Toque/Esc pula. Roda uma vez por sessão e não roda com "reduzir movimento".
 */
const NAME = 'NEXTFIT';
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeIn = (p: number) => p * p * p;
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

export default function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const sym = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = root.current!;
    if (document.documentElement.dataset.intro === 'off') { el.style.display = 'none'; return; }

    const letters = Array.from(name.current!.children) as HTMLElement[];
    // largura acumulada até cada letra (a partir da caixa, que inclui o respiro depois do N): cresce letra a letra, sem vão
    const x0 = name.current!.getBoundingClientRect().left;
    const ends = letters.map(l => l.getBoundingClientRect().right - x0);
    let raf = 0, start = -1, done = false;

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      try { sessionStorage.setItem('intro', '1'); } catch { /* modo privado */ }
      el.style.display = 'none';
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') finish(); };
    el.addEventListener('pointerdown', finish);
    addEventListener('keydown', onKey);

    const frame = (now: number) => {
      if (start < 0) start = now;
      const t = (now - start) / 1000;

      // digitar (0,1–0,5) e apagar (1,5–2,1): lineares, como numa digitação
      const p = t < 1 ? seg(t, 0.1, 0.5) : 1 - seg(t, 1.5, 2.1);
      const n = Math.round(p * letters.length);
      letters.forEach((l, i) => { l.style.opacity = i < n ? '1' : '0'; });
      name.current!.style.width = `${n ? ends[n - 1] : 0}px`; // o N acompanha porque o conjunto é centralizado

      // N: surge, respira, depois cresce e se dissolve com brilho
      const entra = easeOut(seg(t, 0, 0.35));
      const breathe = 1 + 0.04 * Math.sin(Math.PI * seg(t, 0.5, 1.5));
      const sai = seg(t, 2.1, 2.7);
      const s = (0.85 + 0.15 * entra) * breathe * (1 + 5 * easeIn(sai));
      sym.current!.style.transform = `scale(${s})`;
      sym.current!.style.opacity = String(entra * (1 - easeIn(seg(sai, 0.35, 1))));
      sym.current!.style.filter = `drop-shadow(0 0 ${18 + 40 * sai}px rgba(26,140,255,${0.35 + 0.4 * sai}))`;

      // revelação: fundo escuro → tela real
      el.style.opacity = String(1 - easeOut(seg(t, 2.6, 3.1)));

      if (t >= 3.1) finish(); else raf = requestAnimationFrame(frame);
    };
    // começa quando o N já carregou (no máximo 0,6 s de espera), para ele não "piscar" vazio
    const img = sym.current!;
    let go = false;
    const begin = () => { if (!go && !done) { go = true; raf = requestAnimationFrame(frame); } };
    if (img.complete) begin(); else { img.addEventListener('load', begin, { once: true }); img.addEventListener('error', begin, { once: true }); }
    const timer = setTimeout(begin, 600);

    return () => { clearTimeout(timer); cancelAnimationFrame(raf); el.removeEventListener('pointerdown', finish); removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div className="intro" ref={root} aria-hidden="true">
      <div className="intro-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="intro-sym" ref={sym} src="/nextfit-n.png" alt="" width={512} height={258} fetchPriority="high" decoding="sync" />
        <span className="intro-name" ref={name}>
          {NAME.split('').map((c, i) => <span key={i} style={{ opacity: 0 }}>{c}</span>)}
        </span>
      </div>
    </div>
  );
}
