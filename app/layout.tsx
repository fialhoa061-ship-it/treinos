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

// cover: libera o env(safe-area-inset-*) usado no topo, na barra de abas e no timer (notch e barra de início)
export const viewport: Viewport = { themeColor: '#111214', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={manrope.variable} suppressHydrationWarning>
      <body>
        {/* decide antes da pintura: abertura só 1x por sessão e nunca com "reduzir movimento" */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('intro')||matchMedia('(prefers-reduced-motion:reduce)').matches)document.documentElement.dataset.intro='off'}catch(e){}" }} />
        <Intro />
        {children}
      </body>
    </html>
  );
}
