import type { NextConfig } from "next";

// The vendor and admin dashboards are separate Vite apps deployed as their own
// Vercel projects, but they're proxied under this domain's /vendor and /admin
// paths below so the whole platform reads as one URL to visitors. Set these
// once each app has its own Vercel deployment URL.
const VENDOR_APP_URL = process.env.VENDOR_APP_URL;
const ADMIN_APP_URL = process.env.ADMIN_APP_URL;

const nextConfig: NextConfig = {
  transpilePackages: ["@kmo/shared"],
  allowedDevOrigins: ["192.168.1.9", "192.168.5.115"],
  async rewrites() {
    const rules = [];
    if (VENDOR_APP_URL) {
      rules.push(
        { source: "/vendor", destination: `${VENDOR_APP_URL}/vendor` },
        { source: "/vendor/:path*", destination: `${VENDOR_APP_URL}/vendor/:path*` },
      );
    }
    if (ADMIN_APP_URL) {
      rules.push(
        { source: "/admin", destination: `${ADMIN_APP_URL}/admin` },
        { source: "/admin/:path*", destination: `${ADMIN_APP_URL}/admin/:path*` },
      );
    }
    return rules;
  },
};

export default nextConfig;
