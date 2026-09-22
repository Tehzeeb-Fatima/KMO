import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Karachi Mart Online",
  description: "A multi-vendor marketplace for Karachi.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Karachi Mart",
  },
};

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
      )}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
