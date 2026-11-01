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
      <body>{children}</body>
    </html>
  );
}
