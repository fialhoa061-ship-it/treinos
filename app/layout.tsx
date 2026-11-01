import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Treinos',
  description: 'Gestão de treinos de musculação',
  appleWebApp: { capable: true, title: 'Treinos', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { themeColor: '#050816', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* lente do liquid glass: distorce o que está atrás dos controles (backdrop-filter: url(#liquid)) */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
          <filter id="liquid" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves={2} seed={4} result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2.2" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="26" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <div className="ambient" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        {children}
      </body>
    </html>
  );
}
