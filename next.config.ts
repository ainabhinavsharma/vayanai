import type { NextConfig } from 'next';

const isStaticExport = process.env.BUILD_STATIC === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['*.lhr.life', '*.ngrok-free.app', '*.loca.lt', '127.0.0.1:3000', 'localhost:3000'],
  ...(isStaticExport
    ? {
        output: 'export' as const,
        trailingSlash: true
      }
    : {}),
  images: {
    unoptimized: true // Offline/self-hosted images from public directory
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false; // Prevents webpack PackFileCacheStrategy ArrayBuffer allocation crashes on Windows
    }
    return config;
  }
};

export default nextConfig;

