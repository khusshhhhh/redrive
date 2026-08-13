import { Montserrat } from "next/font/google";
import "../app/globals.css";
import Navbar from "./components/navbar/Navbar";
import ToasterProvider from "./providers/ToasterProvider";
import getCurrentUser from "./actions/getCurrentUser";
import DataPreloader from "./providers/DataPreloader";
import LazyModals from "./providers/LazyModals";
import Footer from "./components/Footer";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata = {
  title: "Redrive",
  description: "Created & Developed by Khush Patel & Hiral Mahida",
  icons: { icon: "/icon.svg" },
};

// Navigation and account controls are session-aware on every route.
export const dynamic = "force-dynamic";

// Optimize font loading with display swap and preload
const font = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  preload: true,
});

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
      <body className={`${font.className} bg-white text-ink`}>
        <DataPreloader isAuthenticated={!!currentUser} />
        <ToasterProvider />
        <LazyModals />
        <Navbar currentUser={currentUser} />
        <div className="pb-0 pt-28 min-h-screen">{children}</div>
        <Footer currentUser={currentUser} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
