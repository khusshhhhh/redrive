"use client";

import { usePathname } from "next/navigation"; // ✅ Now used in Client Component
import Container from "../Container";
import Categories from "./Categories";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import { SafeUser } from "@/app/types";
import { Suspense } from "react";
import { BiSearch } from "react-icons/bi";

interface NavbarProps {
  currentUser?: SafeUser | null;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const pathname = usePathname(); // ✅ Now inside Client Component

  // ✅ Hide search bar on listing pages
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showSearchBar = !pathname.startsWith("/confirm-reservation");

  return (
    <div className="sticky top-0 z-30 w-full border-b border-hairline bg-white">
      <div className="py-2.5 sm:py-3">
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
    </div>
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
