import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import Intro from './Intro';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: 'Treinos',
  description: 'Gestão de treinos de musculação',
  appleWebApp: { capable: true, title: 'Treinos', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { themeColor: '#111214', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={manrope.variable} suppressHydrationWarning>
      <body>
        {/* decide antes da pintura: abertura só 1x por sessão e nunca com "reduzir movimento" */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('intro')||matchMedia('(prefers-reduced-motion:reduce)').matches)document.documentElement.dataset.intro='off'}catch(e){}" }} />
        <Intro />
        {/* lente do liquid glass: distorce o que está atrás dos controles (backdrop-filter: url(#liquid)) */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
          <filter id="liquid" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves={2} seed={4} result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2.2" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="26" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
