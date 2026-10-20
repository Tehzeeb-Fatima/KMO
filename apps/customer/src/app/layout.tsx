import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppChrome } from "@/components/app-chrome";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { cn } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-noto-nastaliq-urdu",
  weight: ["400", "700"],
  subsets: ["arabic"],
});

const SITE_URL = "https://karachimartonline.com";
const SITE_DESCRIPTION =
  "Shop online in Karachi from verified local stores: women's and kids' fashion, home and kitchen, clay cookware, jewellery, electronics and more. Cash on delivery across Karachi.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Karachi Mart Online – Online Shopping in Karachi | Cash on Delivery",
    template: "%s",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Karachi Mart Online",
  openGraph: {
    type: "website",
    siteName: "Karachi Mart Online",
    url: SITE_URL,
    title: "Karachi Mart Online – Online Shopping in Karachi",
    description: SITE_DESCRIPTION,
    locale: "en_PK",
    images: [{ url: "/hero/welcome.jpg", alt: "Karachi Mart Online" }],
  },
  twitter: { card: "summary_large_image" },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the Search Console code.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Karachi Mart",
  },
};

/** Tells Google who runs the site and how to search it (sitelinks search box). */
const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Karachi Mart Online",
    url: SITE_URL,
    logo: `${SITE_URL}/android-chrome-512x512.png`,
    email: "contact@karachimartonline.com",
    telephone: "+92 371 2104790",
    areaServed: "Karachi",
    sameAs: [
      "https://www.facebook.com/share/18hwkW51XP/",
      "https://www.instagram.com/karachimartonline/",
      "https://www.tiktok.com/@karachi.mart.online",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Karachi Mart Online",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
];

export const viewport: Viewport = {
  themeColor: "#4a2266",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased font-sans",
        plusJakartaSans.variable,
        ibmPlexMono.variable,
        notoNastaliqUrdu.variable,
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Runs before anything renders so a refresh always opens at the top
            (the browser otherwise restores the old scroll position onto the footer) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{history.scrollRestoration='manual';if(!location.hash)window.scrollTo(0,0)}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        <RegisterServiceWorker />
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
