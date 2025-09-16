// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    return config; // força uso de webpack
  },
};

export default nextConfig;
