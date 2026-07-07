import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bodoni_Moda, Great_Vibes, IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"]
});

const display = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: false
});

const body = Newsreader({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: false
});

const wordmark = Great_Vibes({
  subsets: ["latin"],
  variable: "--font-wordmark",
  display: "swap",
  weight: "400"
});

export const metadata: Metadata = {
  title: "Reverie",
  description:
    "A visible memory engine for provenance-backed extraction, dream consolidation, Ebbinghaus decay, and budgeted retrieval."
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable} ${body.variable} ${wordmark.variable}`}
    >
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
