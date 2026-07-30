import { Montserrat } from "next/font/google";
import "../app/globals.css";
import Navbar from "./components/navbar/Navbar";
import ClientOnly from "./components/ClientOnly";
import RegisterModal from "./components/modals/RegisterModal";
import ToasterProvider from "./providers/ToasterProvider";
import LoginModal from "./components/modals/LoginModal";
import getCurrentUser from "./actions/getCurrentUser";
import RentModal from "./components/modals/RentModal";
import SearchModal from "./components/modals/SearchModal";
import DataPreloader from "./providers/DataPreloader";
import Footer from "./components/Footer";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata = {
  title: "Redrive 1.0",
  description: "Created & Developed by Khush Patel & Hiral Mahida",
};

// Optimize font loading with display swap and preload
const font = Montserrat({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
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
        {/* Preload critical resources */}
        <link rel="preload" href="/test.Suburb.json" as="fetch" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//maps.googleapis.com" />
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
      </head>
      <body className={`${font.className} bg-white text-ink`}>
        <ClientOnly>
          <DataPreloader isAuthenticated={!!currentUser} />
          <ToasterProvider />
          <SearchModal />
          <RentModal />
          <LoginModal />
          <RegisterModal />
          <Navbar currentUser={currentUser} />
        </ClientOnly>
        <div className="pb-0 pt-28 min-h-screen">{children}</div>
        <Footer currentUser={currentUser} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
