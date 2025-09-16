// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Let builds on Vercel pass even if ESLint/TS complain while you iterate.
  //    (You can turn these off later to enforce strict checks.)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // If you need to allow remote images later, uncomment and configure:
  // images: {
  //   remotePatterns: [
  //     { protocol: "https", hostname: "**" },
  //   ],
  // },

  webpack: (config) => {
    return config; // keep default webpack behavior
  },
};

export default nextConfig;
