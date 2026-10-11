import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { PwaRegistrar } from "@/components/PwaRegistrar";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "KRITIVA — Project-aware asset production", template: "%s · KRITIVA" },
  description: "Inspect, resize, compress, validate and package production-ready website assets without uploading your files.",
  applicationName: "KRITIVA",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/kritiva-mark.svg" },
  openGraph: {
    title: "KRITIVA — Create once. Export everything.",
    description: "A private, browser-based workspace for production-ready visual assets.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#f4efe5", colorScheme: "light" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Nonce-based CSP requires request-time rendering so Next can nonce its scripts and styles.
  await headers();
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${mono.variable}`}>{children}<PwaRegistrar /></body>
    </html>
  );
}
