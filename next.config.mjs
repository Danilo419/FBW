/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/img/:path*', destination: '/images/:path*' }, // <- mapeia /img para /images
    ];
  },
};

export default nextConfig;
