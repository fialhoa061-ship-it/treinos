import type { Viewport } from 'next';
import { getImageProps } from 'next/image';
import tall from '../../public/login-bg.webp';
import wide from '../../public/login-bg-wide.webp';
import './login.css';

// teclado do celular encolhe a página (em vez de cobrir): o card fica acima do teclado sem JavaScript
export const loginViewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#05070f', interactiveWidget: 'resizes-content' };

// foto vertical no celular/tablet, horizontal no computador (o navegador baixa só uma)
const WIDE = '(min-width: 960px)';

/** Fundo do login (foto, sombra e marca) com o card de vidro como filho. */
export default function Shell({ children }: { children: React.ReactNode }) {
  const common = { alt: '', sizes: '100vw', priority: true, quality: 90 };
  const { props: { srcSet: wideSet } } = getImageProps({ ...common, src: wide });
  const { props: tallProps } = getImageProps({ ...common, src: tall });
  return (
    <div className="lp">
      <picture>
        <source media={WIDE} srcSet={wideSet} />
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img {...tallProps} className="lp-bg" />
      </picture>
      <div className="lp-shade" aria-hidden="true" />
      <header className="lp-brand">
        <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="38" strokeLinecap="round" aria-hidden="true">
          <circle cx="256" cy="256" r="190" />
          <path d="M160 256h192M196 196v120M316 196v120" strokeWidth="42" />
        </svg>
        <span>fit app</span>
      </header>
      {children}
    </div>
  );
}
