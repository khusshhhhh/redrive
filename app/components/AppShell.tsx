"use client";

import { usePathname } from "next/navigation";

import type { SafeUser } from "@/app/types";
import CompareTray from "./CompareTray";
import Footer from "./Footer";
import MobileBottomNav from "./navbar/MobileBottomNav";

interface AppShellProps {
  children: React.ReactNode;
  currentUser?: SafeUser | null;
}

export default function AppShell({ children, currentUser }: AppShellProps) {
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
          <Footer currentUser={currentUser} />
          <MobileBottomNav currentUser={currentUser} />
          <CompareTray />
        </>
      )}
    </>
  );
}
