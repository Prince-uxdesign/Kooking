import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { OfflineBanner, PwaProvider, UpdateBanner } from "@/features/pwa";

/** Self-hosted at build time by next/font — no runtime request to Google. */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://kooking.app"),
  title: {
    default: "Kooking — Nigerian Cooking Companion",
    template: "%s · Kooking",
  },
  description:
    "Kooking is a mobile-first Nigerian cooking companion — discover, check, shop, and cook step-by-step with confidence.",
  keywords: [
    "Nigerian recipes",
    "cooking companion",
    "jollof rice",
    "kitchen check",
    "Nigerian food",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kooking",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://kooking.app",
    siteName: "Kooking",
    title: "Kooking — Nigerian Cooking Companion",
    description:
      "Discover recipes, check ingredients, shop, and cook step-by-step with confidence.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kooking — Nigerian Cooking Companion",
    description:
      "Discover recipes, check ingredients, shop, and cook step-by-step with confidence.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111311" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <PwaProvider>
          <UpdateBanner />
          <OfflineBanner />
          {children}
        </PwaProvider>
      </body>
    </html>
  );
}
