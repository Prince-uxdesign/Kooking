import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Narrow, Gloock, Host_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthContext";
import { OfflineBanner, PwaProvider, UpdateBanner } from "@/features/pwa";

/** Self-hosted at build time by next/font — no runtime request to Google. */
const host = Host_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-host",
});

const gloock = Gloock({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-gloock",
});

/** Big landing headlines; Gloock stays on the wordmark. */
const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
});

/** Small uppercase labels and nav links on the landing page. */
const archivoNarrow = Archivo_Narrow({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo-narrow",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://kooking.app"),
  title: {
    default: "Fork — Nigerian Cooking Companion",
    template: "%s · Fork",
  },
  description:
    "Fork is a mobile-first Nigerian cooking companion — discover, check, shop, and cook step-by-step with confidence.",
  keywords: [
    "Nigerian recipes",
    "cooking companion",
    "jollof rice",
    "kitchen check",
    "Nigerian food",
  ],
  icons: {
    icon: [
      { url: "/icons/mark.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fork",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://kooking.app",
    siteName: "Fork",
    title: "Fork — Nigerian Cooking Companion",
    description:
      "Discover recipes, check ingredients, shop, and cook step-by-step with confidence.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fork — Nigerian Cooking Companion",
    description:
      "Discover recipes, check ingredients, shop, and cook step-by-step with confidence.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#15120f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${host.variable} ${gloock.variable} ${archivo.variable} ${archivoNarrow.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <PwaProvider>
          <AuthProvider>
            <UpdateBanner />
            <OfflineBanner />
            {children}
          </AuthProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
