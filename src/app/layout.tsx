import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { branding } from "@/data/branding";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: `${branding.name} · ${branding.panelTitle}`,
  description: branding.tagline,
  robots: { index: false, follow: false },
};

// Nonce-based CSP requires dynamic rendering: Next.js injects the per-request
// nonce into its scripts/styles during SSR, which cannot happen for statically
// prerendered pages. Acceptable for this authenticated, single-admin tool (no
// CDN caching of pages is expected).
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-MX"
      data-scroll-behavior="smooth"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
