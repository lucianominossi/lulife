import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // PGlite breaks when webpack/turbopack bundle it (import.meta.url → URL → path error)
  serverExternalPackages: [
    "@electric-sql/pglite",
    "@neondatabase/serverless",
  ],
};

export default nextConfig;
