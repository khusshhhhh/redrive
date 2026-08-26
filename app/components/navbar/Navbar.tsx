"use client";

import { usePathname } from "next/navigation"; // ✅ Now used in Client Component
import Container from "../Container";
import Categories from "./Categories";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import { SafeUser } from "@/app/types";
import { Suspense, useEffect, useRef, useState } from "react";
import { BiSearch } from "react-icons/bi";

interface NavbarProps {
  currentUser?: SafeUser | null;
}

const HEADER_COLLAPSE_SCROLL_Y = 48;
const HEADER_EXPAND_SCROLL_Y = 8;

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const pathname = usePathname(); // ✅ Now inside Client Component
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const updateHeader = () => {
      if (!desktopQuery.matches) {
        setIsScrolled(false);
        return;
      }

      // The header and its layout spacer become shorter in compact mode. Using
      // one threshold lets that height change push scrollY back across the same
      // boundary, causing the two header states to flicker. Hysteresis keeps the
      // current state stable until the user has clearly scrolled the other way.
      setIsScrolled((current) =>
        current
          ? window.scrollY > HEADER_EXPAND_SCROLL_Y
          : window.scrollY > HEADER_COLLAPSE_SCROLL_Y,
      );
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    desktopQuery.addEventListener("change", updateHeader);
    return () => {
      window.removeEventListener("scroll", updateHeader);
      desktopQuery.removeEventListener("change", updateHeader);
    };
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;

    const updateHeight = () => {
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height ?? 0);
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [pathname]);

  // ✅ Hide search bar on listing pages
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showSearchBar = !pathname.startsWith("/confirm-reservation");

  return (
    <>
    <header ref={headerRef} className={`fixed inset-x-0 top-0 z-30 w-full border-b bg-white/95 backdrop-blur-md transition-[box-shadow,border-color] duration-300 ${isScrolled ? "border-hairline shadow-[0_8px_24px_rgba(24,54,58,0.08)]" : "border-hairline-soft shadow-none"}`}>
      <div className={`transition-[padding] duration-300 ${isScrolled ? "py-2" : "py-2.5 sm:py-3"}`}>
        <Container>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2.5 md:grid-cols-[auto_1fr_auto] md:gap-x-3 xl:grid-cols-[1fr_auto_1fr]">
            <div className="shrink-0">
              <Logo />
            </div>
            <div className="col-start-2 row-start-1 flex min-w-0 justify-center md:col-span-1 md:col-start-auto md:row-start-auto">
              <div className={`max-w-fit transition-[max-width,transform] duration-300 ease-out motion-reduce:transition-none ${pathname === "/" && !isScrolled ? "md:w-full md:max-w-[540px] xl:-translate-x-6" : "md:max-w-[440px]"}`}>
                <Suspense fallback={<SearchFallback />}>
                  <Search compact={isScrolled} isHome={pathname === "/"} />
                </Suspense>
              </div>
            </div>
            <div className="col-start-3 row-start-1 shrink-0 md:col-start-auto md:row-start-auto md:justify-self-end">
              <UserMenu currentUser={currentUser} prominent={pathname === "/" && !isScrolled} />
            </div>
          </div>
        </Container>
      </div>
      {pathname === "/" && (
        <Suspense fallback={<div className="h-16 border-t border-transparent sm:h-[72px]" aria-hidden="true" />}>
          <Categories compact={isScrolled} />
        </Suspense>
      )}
    </header>
    <div
      aria-hidden="true"
      className={pathname === "/" ? "h-[128px] sm:h-[140px]" : "h-[64px] md:h-[68px]"}
      style={headerHeight ? { height: `${headerHeight}px` } : undefined}
    />
    </>
  );
};

export default Navbar;

function SearchFallback() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ink md:h-[48px] md:w-[460px] md:justify-between md:py-2 md:shadow-card" aria-hidden="true">
      <span className="hidden px-6 text-sm font-medium text-ink md:block">Anywhere</span>
      <span className="hidden flex-1 border-x border-hairline px-10 text-center text-sm font-medium text-ink md:block">Any Week</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full md:mr-2 md:bg-primary md:text-white"><BiSearch size={20} /></span>
    </div>
  );
}
