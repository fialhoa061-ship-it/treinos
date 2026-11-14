'use client';

import { useEffect, useRef } from 'react';

/**
 * Abertura animada (3,2 s), dirigida por tempo (rAF) com curvas de easing.
 *  0,0–0,5   o N da logo surge (fade + leve crescimento)
 *  0,15–1,0  "NEXTFIT" entra em onda (fade + subida, várias letras ao mesmo tempo); o conjunto desliza para o centro
 *  1,0–1,45  pausa; o N "respira" (0,9–1,5)
 *  1,45–2,15 as letras saem da direita p/ esquerda; o N desliza suave até o centro
 *  2,15–2,75 o N cresce e se dissolve num brilho azul
 *  2,6–3,2   o fundo escuro some, revelando a tela real
 * Só anima transform e opacity (a placa de vídeo faz o trabalho, sem recalcular layout): fica liso no celular.
 * Toque/Esc pula. Roda uma vez por sessão e não roda com "reduzir movimento".
 */
const NAME = 'NEXTFIT';
const FIM = 3.2;
const ONDA = 2.2; // quantas letras ficam em movimento ao mesmo tempo
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeIn = (p: number) => p * p * p;
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOutBack = (p: number) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2); // passa um pouco e volta

export default function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const sym = useRef<HTMLImageElement>(null);
  const glow = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current!;
    if (document.documentElement.dataset.intro === 'off') { el.style.display = 'none'; return; }

    const letters = Array.from(name.current!.children) as HTMLElement[];
    // onde termina cada letra, medido a partir da borda direita do N (inclui o respiro entre os dois)
    const x0 = name.current!.previousElementSibling!.getBoundingClientRect().right;
    const ends = letters.map(l => l.getBoundingClientRect().right - x0);
    const total = ends.at(-1) ?? 0;
    // largura "revelada" contínua: k letras inteiras + a fração da próxima
    const revelado = (q: number) => { const k = Math.floor(q), f = q - k; const a = k ? ends[k - 1] : 0; return k >= ends.length ? total : a + f * (ends[k] - a); };
    const mover = (letrasVisiveis: number) => { logo.current!.style.transform = `translate3d(${(total - revelado(letrasVisiveis)) / 2}px, 0, 0)`; };
    mover(0); // já começa com o N no centro, antes do primeiro quadro
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

      // onda de letras: cada uma leva ONDA "letras de tempo" para entrar, então várias se movem juntas (sem estalos)
      const p = t < 1.2 ? easeInOut(seg(t, 0.15, 1.0)) : 1 - easeInOut(seg(t, 1.45, 2.15));
      const q = p * (letters.length - 1 + ONDA);
      let c = 0;
      letters.forEach((l, i) => {
        const v = clamp((q - i) / ONDA); // 0 = fora, 1 = no lugar
        c += v;
        l.style.opacity = String(easeOut(v));
        l.style.transform = `translate3d(0, ${(1 - easeOut(v)) * 0.3}em, 0)`;
      });
      // o conjunto fica centralizado pela parte visível: o N desliza junto, sem saltos
      mover(c);

      // N: surge, respira, cresce e se dissolve
      const entra = seg(t, 0, 0.5);
      const breathe = 1 + 0.035 * Math.sin(Math.PI * seg(t, 0.9, 1.5));
      const sai = seg(t, 2.15, 2.75);
      const s = (0.8 + 0.2 * easeOutBack(entra)) * breathe * (1 + 3.5 * easeIn(sai));
      sym.current!.style.transform = `scale(${s})`;
      sym.current!.style.opacity = String(easeOut(entra) * (1 - easeIn(seg(sai, 0.3, 1))));
      // brilho: aparece com o N e explode na saída (só opacidade e escala)
      glow.current!.style.opacity = String(0.55 * easeOut(entra) * (1 - sai) + 0.9 * Math.sin(Math.PI * sai));
      glow.current!.style.transform = `translate(-50%, -50%) scale(${1 + 2.5 * easeOut(sai)})`;

      // revelação: fundo escuro → tela real
      el.style.opacity = String(1 - easeInOut(seg(t, 2.6, FIM)));

      if (t >= FIM) finish(); else raf = requestAnimationFrame(frame);
    };
    // começa quando o N já está pronto para desenhar (no máximo 0,6 s de espera), para ele não "piscar" vazio
    let go = false;
    const begin = () => { if (!go && !done) { go = true; raf = requestAnimationFrame(frame); } };
    sym.current!.decode().then(begin, begin);
    const timer = setTimeout(begin, 600);

    return () => { clearTimeout(timer); cancelAnimationFrame(raf); el.removeEventListener('pointerdown', finish); removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div className="intro" ref={root} aria-hidden="true">
      <div className="intro-logo" ref={logo}>
        <span className="intro-mark">
          <span className="intro-glow" ref={glow} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="intro-sym" ref={sym} src="/nextfit-n.png" alt="" width={512} height={258} fetchPriority="high" />
        </span>
        <span className="intro-name" ref={name}>
          {NAME.split('').map((c, i) => <span key={i}>{c}</span>)}
        </span>
      </div>
    </div>
  );
}
