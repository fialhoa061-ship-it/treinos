import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEXTFIT',
    short_name: 'NEXTFIT',
    description: 'Gestão de treinos de musculação',
    start_url: '/',
    display: 'standalone',
    background_color: '#05070d', // fundo da logo: a tela de abertura do Android combina com o ícone
    theme_color: '#111214',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // fundo até a borda: o Android recorta no formato do aparelho
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
