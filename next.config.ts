import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  reactStrictMode: true,
};

export default nextConfig;
