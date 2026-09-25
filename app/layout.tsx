import "../app/globals.css";
import "react-loading-skeleton/dist/skeleton.css";
import Navbar from "./components/navbar/Navbar";
import ToasterProvider from "./providers/ToasterProvider";
import CurrentUserProvider from "./providers/CurrentUserProvider";
import SWRProvider from "./providers/SWRProvider";
import DataPreloader from "./providers/DataPreloader";
import LazyModals from "./providers/LazyModals";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Manrope } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { siteUrl } from "./libs/siteUrl";
import AppShell from "./components/AppShell";
import favicon from "./favicon.png";
import IdleSessionGuard from "./components/auth/IdleSessionGuard";
import { sessionIdleTimeoutMs } from "./libs/sessionPolicy";
import JsonLd from "./components/seo/JsonLd";
import { ORGANIZATION_DESCRIPTION, ORGANIZATION_ID, WEBSITE_ID, graph } from "./libs/structuredData";

const supportEmail = process.env.SUPPORT_CONTACT_EMAIL || "support@redrive.com.au";

// Official profiles (Instagram, LinkedIn, Facebook, X, ...) as a comma-separated
// list. `sameAs` is how Google's Knowledge Graph and AI answer engines tie those
// profiles to the Redrive entity.
const sameAs = (process.env.NEXT_PUBLIC_SOCIAL_PROFILES || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

// Search Console / Bing Webmaster ownership tokens (meta-tag method).
const verification: Metadata["verification"] = {
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
  ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
};

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-redrive",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Redrive",
  authors: [{ name: "Redrive", url: siteUrl }, { name: "Khush Patel" }, { name: "Hiral Mahida" }],
  creator: "Khush Patel",
  publisher: "Redrive",
  category: "Travel and transportation",
  classification: "Peer-to-peer vehicle sharing marketplace",
  referrer: "origin-when-cross-origin",
  title: {
    default: "Redrive | Peer-to-peer vehicle hire in Australia",
    template: "%s | Redrive",
  },
  description: "Discover and share cars, campervans and useful vehicles across Australia with clear booking tools, secure profiles and local hosts.",
  keywords: ["vehicle hire Australia", "peer-to-peer car hire", "campervan hire Australia", "ute hire", "van hire", "car sharing Australia", "local vehicle hosts", "road trip vehicles", "Redrive"],
  formatDetection: { email: false, address: false, telephone: false },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Redrive",
    title: "Redrive | Peer-to-peer vehicle hire in Australia",
    description: "Discover and share cars, campervans and useful vehicles across Australia.",
    url: siteUrl,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Redrive — useful vehicles shared locally across Australia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Redrive | Peer-to-peer vehicle hire in Australia",
    description: "Discover and share cars, campervans and useful vehicles across Australia.",
    images: [{ url: "/opengraph-image", alt: "Redrive — useful vehicles shared locally across Australia" }],
  },
  icons: {
    icon: [{ url: favicon.src, type: "image/png", sizes: "200x200" }],
    shortcut: [{ url: favicon.src, type: "image/png", sizes: "200x200" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Redrive" },
  verification,
  other: {
    "content-language": "en-AU",
    "geo.region": "AU",
    "geo.placename": "Australia",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1F1F" },
  ],
};

// The navbar/footer/nav are session-aware, but they now hydrate the current
// user on the client via CurrentUserProvider (`/api/me`). Keeping that work out
// of this layout lets static and ISR routes actually be prerendered instead of
// every route being forced dynamic.

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="dns-prefetch" href="//maps.googleapis.com" />
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
        <JsonLd
          data={graph(
            {
              "@type": "Organization",
              "@id": ORGANIZATION_ID,
              name: "Redrive",
              alternateName: "Redrive Australia",
              url: siteUrl,
              logo: { "@type": "ImageObject", url: new URL(favicon.src, siteUrl).toString(), width: 200, height: 200 },
              description: ORGANIZATION_DESCRIPTION,
              slogan: "Rent a useful vehicle, or earn from yours.",
              founder: [
                { "@type": "Person", name: "Khush Patel" },
                { "@type": "Person", name: "Hiral Mahida" },
              ],
              areaServed: { "@type": "Country", name: "Australia" },
              knowsAbout: [
                "Peer-to-peer car hire",
                "Ute hire",
                "Van hire",
                "Campervan hire",
                "Vehicle sharing",
                "Earning income from a parked vehicle",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: supportEmail,
                areaServed: "AU",
                availableLanguage: ["en-AU"],
              },
              ...(sameAs.length ? { sameAs } : {}),
            },
            {
              "@type": "WebSite",
              "@id": WEBSITE_ID,
              name: "Redrive",
              url: siteUrl,
              description: ORGANIZATION_DESCRIPTION,
              inLanguage: "en-AU",
              publisher: { "@id": ORGANIZATION_ID },
            },
          )}
        />
      </head>
      <body className={`${manrope.variable} bg-white text-ink`} suppressHydrationWarning>
        <CurrentUserProvider>
          <SWRProvider>
            <IdleSessionGuard idleTimeoutMs={sessionIdleTimeoutMs()} />
            <DataPreloader />
            <ToasterProvider />
            <LazyModals />
            <Navbar />
            <AppShell>{children}</AppShell>
          </SWRProvider>
        </CurrentUserProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
