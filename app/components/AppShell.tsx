"use client";

import { usePathname } from "next/navigation";

import CompareTray from "./CompareTray";
import Footer from "./Footer";
import MobileBottomNav from "./navbar/MobileBottomNav";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isMessagesRoute = pathname.startsWith("/messages");

  return (
    <>
      <main
        className={
          isMessagesRoute
            ? "app-content h-[calc(100dvh-var(--app-header-height,64px))] min-h-0 overflow-hidden bg-surface-soft/55"
            : "app-content min-h-screen pb-20 md:pb-0"
        }
      >
        {children}
      </main>
      {!isMessagesRoute && (
        <>
          <Footer />
          <MobileBottomNav />
          <CompareTray />
        </>
      )}
    </>
  );
}
