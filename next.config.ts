// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ❌ USUNIĘTE: eslint (przestarzałe w Next.js 16)

  typescript: {
    ignoreBuildErrors: true,
  },

experimental: {
  serverMinification: process.env.NODE_ENV === 'production', // włącz minifikację w produkcji
  serverActions: {
    allowedOrigins: process.env.NODE_ENV === 'production'
      ? [
          'localhost:3000',
          'healthprosystem.com', // zamień na swoją domenę Railway
          // dodaj inne domeny jeśli masz
        ]
      : ['*'] // w developmencie pozwalaj na wszystkie
  }
},

  reactStrictMode: false,
  staticPageGenerationTimeout: 1000,
  poweredByHeader: false,
  compress: true,

  // ✅ POPRAWIONE: images.domains → images.remotePatterns
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ebooks-in.s3.eu-central-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 's3.eu-central-1.amazonaws.com',
      },
    ],
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