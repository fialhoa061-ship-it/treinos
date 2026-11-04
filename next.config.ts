import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 90 = fotos do login (app/login/page.tsx); 75 = padrão do Next
  images: { qualities: [75, 90] },
  // esconde o botão "N" do Next só no modo de desenvolvimento (em produção ele nunca aparece)
  devIndicators: false,
};

export default nextConfig;
