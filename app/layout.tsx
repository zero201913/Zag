import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Ambient } from "@/components/ambient";
import { AppearanceProvider } from "@/components/appearance-provider";
import { AppearanceScript } from "@/components/appearance-script";
import { FpsMeter } from "@/components/fps-meter";
import { MusicProvider } from "@/components/music-provider";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { ThemeScript } from "@/components/theme-script";
import { VinylPlayer } from "@/components/vinyl-player";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.fullName,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: SITE.fullName,
    description: SITE.description,
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.fullName,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efe8" },
    { media: "(prefers-color-scheme: dark)", color: "#070812" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <AppearanceScript />
      </head>
      <body>
        <Ambient />
        <SmoothScroll />
        <MusicProvider>
          <AppearanceProvider>
            <SiteChrome footer={<SiteFooter />}>{children}</SiteChrome>
            <VinylPlayer />
          </AppearanceProvider>
        </MusicProvider>
        <FpsMeter />
      </body>
    </html>
  );
}