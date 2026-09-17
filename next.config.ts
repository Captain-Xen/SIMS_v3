import type { NextConfig } from "next";

// Security headers applied to every route. Chosen so they harden the app
// (clickjacking, MIME sniffing, referrer leakage, browser feature abuse)
// without breaking Next.js's inline runtime scripts or Tailwind styles.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
