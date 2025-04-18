import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Added these to make debugging easier in production
  distDir: '.next',
  poweredByHeader: false,
  // Added basePath and assetPrefix for better routing
  trailingSlash: false,
  // Moved serverComponentsExternalPackages out of experimental as per warning
  serverExternalPackages: ['@neondatabase/serverless'],
  // Keep other experimental settings if needed
  experimental: {},
  env: {
    ANILIST_API_BASE: process.env.ANILIST_API_BASE || '',
  },
};

export default nextConfig;
