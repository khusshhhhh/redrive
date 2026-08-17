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

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const pathname = usePathname(); // ✅ Now inside Client Component
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 18);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
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
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2.5 md:gap-y-0">
            <div className="shrink-0">
              <Logo />
            </div>
            <div className="col-span-3 row-start-2 min-w-0 md:col-span-1 md:row-start-auto md:flex md:justify-center">
              <div className="w-full md:w-auto">
                <Suspense fallback={<SearchFallback />}>
                  <Search />
                </Suspense>
              </div>
            </div>
            <div className="col-start-3 row-start-1 shrink-0 md:col-start-auto md:row-start-auto">
              <UserMenu currentUser={currentUser} />
            </div>
          </div>
        </Container>
      </div>
      {pathname === "/" && (
        <Suspense fallback={<div className="h-[58px] border-t border-transparent" aria-hidden="true" />}>
          <Categories />
        </Suspense>
      )}
    </header>
    <div
      aria-hidden="true"
      className={pathname === "/" ? "h-[174px] md:h-[126px]" : "h-[112px] md:h-[68px]"}
      style={headerHeight ? { height: `${headerHeight}px` } : undefined}
    />
    </>
  );
};

export default Navbar;

function SearchFallback() {
  return (
    <div className="flex h-[48px] w-full items-center justify-between rounded-full border border-hairline bg-white py-2 shadow-card md:w-[460px]" aria-hidden="true">
      <span className="px-6 text-sm font-medium text-ink">Anywhere</span>
      <span className="hidden flex-1 border-x border-hairline px-10 text-center text-sm font-medium text-ink sm:block">Any Week</span>
      <span className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"><BiSearch size={18} /></span>
    </div>
  );
}
