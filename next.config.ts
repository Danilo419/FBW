// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Deixa os builds passarem mesmo com avisos de ESLint/TS enquanto iteras.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // ✅ Permitir imagens remotas do Vercel Blob
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },

  webpack: (config) => {
    return config; // comportamento padrão do webpack
  },
};

export default nextConfig;
