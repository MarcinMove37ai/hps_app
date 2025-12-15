// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,  // <-- DODAJ TO
  },

  experimental: {
    serverMinification: false,
    serverActions: { allowedOrigins: ['*'] }
  },

  reactStrictMode: false,
  staticPageGenerationTimeout: 1000,
  poweredByHeader: false,
  compress: true,

  // Konfiguracja obrazów
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
    domains: ['ebooks-in.s3.eu-central-1.amazonaws.com', 's3.eu-central-1.amazonaws.com'],
  },

  async redirects() {
    return [
      {
        source: '/reset-password',
        destination: '/restore',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;