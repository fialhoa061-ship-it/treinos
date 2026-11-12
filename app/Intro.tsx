'use client';

import { useEffect, useRef } from 'react';

/**
 * Abertura animada (3,1 s), dirigida por tempo (rAF) com curvas de easing.
 *  0,0–0,4  símbolo à direita; o nome é digitado letra por letra
 *  0,4–1,5  pausa; o símbolo "respira" (1,00 → 1,03 → 1,00)
 *  1,5–2,1  letras apagam da direita p/ esquerda; símbolo desliza ao centro
 *  2,1–2,7  símbolo gira ~110° e cresce 1x → 40x (ease-in) até cobrir a tela de branco
 *  2,7–3,1  fade do branco para a tela real
 * Toque/Esc pula. Roda uma vez por sessão e não roda com "reduzir movimento".
 */
const NAME = 'fit app';
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeIn = (p: number) => p * p * p;
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

export default function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const sym = useRef<HTMLSpanElement>(null);
  const flood = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    if (document.documentElement.dataset.intro === 'off') { el.style.display = 'none'; return; }

    const letters = Array.from(name.current!.children) as HTMLElement[];
    // largura acumulada até cada letra: a caixa do nome cresce letra a letra, sem vão antes do símbolo
    const x0 = letters[0]?.getBoundingClientRect().left ?? 0;
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

      // digitar (0–0,4) e apagar (1,5–2,1): lineares, como numa digitação
      const p = t < 1 ? seg(t, 0, 0.4) : 1 - seg(t, 1.5, 2.1);
      const n = Math.round(p * letters.length);
      letters.forEach((l, i) => { l.style.opacity = i < n ? '1' : '0'; });
      name.current!.style.width = `${n ? ends[n - 1] : 0}px`; // o símbolo acompanha porque o conjunto é centralizado

      // símbolo: respira, depois gira e invade a tela
      const breathe = 1 + 0.03 * Math.sin(Math.PI * seg(t, 0.4, 1.5));
      const s4 = seg(t, 2.1, 2.7);
      const e = easeIn(s4);
      sym.current!.style.transform = `rotate(${110 * e}deg) scale(${Math.pow(40, e) * breathe})`;

      // garante cobertura total no fim da cena 4, sem bordas coloridas
      flood.current!.style.opacity = String(seg(s4, 0.55, 1));

      // revelação: branco → tela real
      el.style.opacity = String(1 - easeOut(seg(t, 2.7, 3.1)));

      if (t >= 3.1) finish(); else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointerdown', finish); removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div className="intro" ref={root} aria-hidden="true">
      <div className="intro-logo">
        <span className="intro-name" ref={name}>
          {NAME.split('').map((c, i) => <span key={i} style={{ opacity: 0 }}>{c}</span>)}
        </span>
        <span className="intro-sym" ref={sym}>
          <svg viewBox="0 0 512 512" fill="none" stroke="#fff" strokeWidth="34" strokeLinecap="round">
            <circle cx="256" cy="256" r="190" />
            <path d="M160 256h192M196 196v120M316 196v120" strokeWidth="38" />
          </svg>
        </span>
      </div>
      <div className="intro-flood" ref={flood} />
    </div>
  );
}
