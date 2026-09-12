import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Resource optimizations:
  poweredByHeader: false, // fewer headers, negligible info leak removed
  compress: true, // gzip API/SSR responses (default on, kept explicit)
  experimental: {
    // Smaller client chunks: barrel-file packages are tree-shaken per import.
    optimizePackageImports: ["recharts", "date-fns", "@tanstack/react-query"],
    // Cap the Turbopack compiler heap (unit: BYTES, default ~4 GB) so the dev
    // server GCs aggressively and stays a lean long-running process.
    turbopackMemoryLimit: 768 * 1024 * 1024,
  },
};

export default nextConfig;
