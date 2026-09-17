import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/cart", "/checkout", "/order-confirmation"],
    },
    sitemap: "https://karachimart.online/sitemap.xml",
  };
}
