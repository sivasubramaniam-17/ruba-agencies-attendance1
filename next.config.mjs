/** @type {import('next').NextConfig} */
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
runtimeCaching: [
  {
    urlPattern: /^https?.*/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'offlineCache',
      networkTimeoutSeconds: 10,
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      }
    }
  },
  {
    urlPattern: /\/_next\/static\/.*/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'static-assets',
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
      }
    }
  },
  {
    urlPattern: /\/manifest\.json$/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'manifest',
      expiration: {
        maxEntries: 1,
        maxAgeSeconds: 24 * 60 * 60 // 1 day
      }
    }
  }
],
  buildExcludes: [/middleware-manifest\.json$/],
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  output: "standalone",
  compress: true,
  poweredByHeader: false,

  eslint: {
    ignoreDuringBuilds: true,
  },
  headers: async () => [
  {
    source: '/manifest.json',
    headers: [
      { key: 'Cache-Control', value: 'public, max-age=86400' }
    ]
  }
],

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },
};

export default withPWA(nextConfig);
