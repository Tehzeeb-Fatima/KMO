import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@kmo/shared"],
  allowedDevOrigins: ["192.168.1.9", "192.168.5.115"],
  // Common policy URLs (e.g. asked for by Meta) point to the pages that already
  // exist, so search engines never see the same policy twice.
  async redirects() {
    return [
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/return-refund-policy", destination: "/exchange-policy", permanent: true },
      { source: "/refund-policy", destination: "/exchange-policy", permanent: true },
    ];
  },
};

export default nextConfig;
