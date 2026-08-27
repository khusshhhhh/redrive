import "../app/globals.css";
import Navbar from "./components/navbar/Navbar";
import ToasterProvider from "./providers/ToasterProvider";
import getCurrentUser from "./actions/getCurrentUser";
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

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-redrive",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Redrive",
  authors: [{ name: "Redrive", url: siteUrl }, { name: "Khush Patel" }],
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
    { media: "(prefers-color-scheme: dark)", color: "#161616" },
  ],
};

// Navigation and account controls are session-aware on every route.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en-AU">
      <head>
        <link rel="dns-prefetch" href="//maps.googleapis.com" />
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${siteUrl}/#organization`,
                  name: "Redrive",
                  url: siteUrl,
                  logo: new URL(favicon.src, siteUrl).toString(),
                  founder: { "@type": "Person", name: "Khush Patel" },
                  areaServed: { "@type": "Country", name: "Australia" },
                },
                {
                  "@type": "WebSite",
                  "@id": `${siteUrl}/#website`,
                  name: "Redrive",
                  url: siteUrl,
                  inLanguage: "en-AU",
                  publisher: { "@id": `${siteUrl}/#organization` },
                },
              ],
            }).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body className={`${manrope.variable} bg-white text-ink`}>
        <IdleSessionGuard isAuthenticated={!!currentUser} idleTimeoutMs={sessionIdleTimeoutMs()} />
        <DataPreloader isAuthenticated={!!currentUser} />
        <ToasterProvider />
        <LazyModals />
        <Navbar currentUser={currentUser} />
        <AppShell currentUser={currentUser}>{children}</AppShell>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
