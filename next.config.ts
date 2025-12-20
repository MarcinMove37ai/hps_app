// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ POPRAWIONE: przeniesione z experimental
  serverExternalPackages: ['pg', 'pg-native'],

  experimental: {
    serverMinification: process.env.NODE_ENV === 'production',
    serverActions: {
      allowedOrigins: process.env.NODE_ENV === 'production'
        ? [
            'localhost:3000',
            'healthprosystem.com',
          ]
        : ['*']
    },
  },

  reactStrictMode: false,
  staticPageGenerationTimeout: 1000,
  poweredByHeader: false,
  compress: true,

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