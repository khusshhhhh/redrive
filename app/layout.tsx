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
      <body className="bg-white text-ink">
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
