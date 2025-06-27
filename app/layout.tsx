import { Montserrat } from "next/font/google"; // ✅ Import Poppins font
import "../app/globals.css";
import Navbar from "./components/navbar/Navbar";
import ClientOnly from "./components/ClientOnly";
import RegisterModal from "./components/modals/RegisterModal";
import ToasterProvider from "./providers/ToasterProvider";
import LoginModal from "./components/modals/LoginModal";
import getCurrentUser from "./actions/getCurrentUser";
import RentModal from "./components/modals/RentModal";
import SearchModal from "./components/modals/SearchModal";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import ThemeProvider from "./providers/ThemeProvider";

export const metadata = {
  title: "Redrive 1.0",
  description: "Created & Developed by Khush Patel & Hiral Mahida",
};

// ✅ Apply Poppins font
const font = Montserrat({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body className={font.className}>
        <ThemeProvider>
          <ClientOnly>
            <ToasterProvider />
            <SearchModal />
            <RentModal />
            <LoginModal />
            <RegisterModal />
            <Navbar currentUser={currentUser} />
          </ClientOnly>
          <div className="pb-20 pt-28">{children}</div>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
