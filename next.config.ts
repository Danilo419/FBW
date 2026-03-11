// next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * next-intl plugin
 * Path to the request config
 */
const withNextIntl = createNextIntlPlugin("src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },

  experimental: {
    typedRoutes: true,
  },

  webpack(config) {
    return config;
  },
};

export default withNextIntl(nextConfig);