import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Karachi Mart Online",
    short_name: "Karachi Mart",
    description: "A marketplace for one city — verified Karachi vendors, cash on delivery.",
    start_url: "/",
    display: "standalone",
    background_color: "#ede9f2",
    theme_color: "#4a2266",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
