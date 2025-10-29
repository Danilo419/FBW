/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Permite carregar imagens alojadas no Vercel Blob
    remotePatterns: [
      {
        protocol: "https",
        hostname: "public.blob.vercel-storage.com",
      },
    ],
  },

  async rewrites() {
    return [
      { source: "/img/:path*", destination: "/images/:path*" }, // mapeia /img para /images
    ];
  },
};

export default nextConfig;
