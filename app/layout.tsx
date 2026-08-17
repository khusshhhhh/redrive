import "../app/globals.css";
import Navbar from "./components/navbar/Navbar";
import ToasterProvider from "./providers/ToasterProvider";
import getCurrentUser from "./actions/getCurrentUser";
import DataPreloader from "./providers/DataPreloader";
import LazyModals from "./providers/LazyModals";
import Footer from "./components/Footer";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Manrope } from "next/font/google";
import type { Metadata } from "next";
import { siteUrl } from "./libs/siteUrl";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-redrive",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Redrive | Peer-to-peer vehicle hire in Australia",
    template: "%s | Redrive",
  },
  description: "Discover and share cars, campervans and useful vehicles across Australia with clear booking tools, secure profiles and local hosts.",
  keywords: ["vehicle hire Australia", "peer-to-peer car hire", "campervan hire", "car sharing Australia", "road trip vehicles"],
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Redrive",
    title: "Redrive | Peer-to-peer vehicle hire in Australia",
    description: "Discover and share cars, campervans and useful vehicles across Australia.",
  },
  icons: { icon: "/icon.svg" },
};

// Navigation and account controls are session-aware on every route.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="//maps.googleapis.com" />
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
      </head>
      <body className={`${manrope.variable} bg-white text-ink`}>
        <DataPreloader isAuthenticated={!!currentUser} />
        <ToasterProvider />
        <LazyModals />
        <Navbar currentUser={currentUser} />
        <div className="min-h-screen pb-0">{children}</div>
        <Footer currentUser={currentUser} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
