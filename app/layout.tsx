import { Poppins } from "next/font/google"; // ✅ Import Poppins font
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

export const metadata = {
  title: "Redrive",
  description: "Created by Khush Patel",
};

// ✅ Apply Poppins font
const font = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // ✅ Specify weights you need
  variable: "--font-poppins", // ✅ Optional: Define a CSS variable for easier use
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body className={font.className}> {/* ✅ Apply Poppins font here */}
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
      </body>
    </html>
  );
}
