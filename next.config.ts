import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 90 = fotos do login (app/login/page.tsx); 75 = padrão do Next
  images: { qualities: [75, 90] },
  // esconde o botão "N" do Next só no modo de desenvolvimento (em produção ele nunca aparece)
  devIndicators: false,
  // service worker do aluno (public/sw.js): sempre a versão mais nova, nunca em cache do navegador
  async headers() {
    return [{
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      ],
    }];
  },
};

export default nextConfig;
