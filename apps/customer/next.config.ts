import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@kmo/shared"],
  allowedDevOrigins: ["192.168.1.9", "192.168.5.115"],
};

export default nextConfig;
