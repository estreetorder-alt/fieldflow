import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles compression natively
  compress: false,
  // Required for Tailwind v4 CSS import
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
};

export default nextConfig;
