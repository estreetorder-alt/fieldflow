import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles compression natively
  compress: false,
  // Required for Tailwind v4 CSS import
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
