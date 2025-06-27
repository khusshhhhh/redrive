"use client";

import { usePathname } from "next/navigation"; // ✅ Now used in Client Component
import Container from "../Container";
import Categories from "./Categories";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import ThemeSwitcher from "./ThemeSwitcher";
import { SafeUser } from "@/app/types";

interface NavbarProps {
  currentUser?: SafeUser | null;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const pathname = usePathname(); // ✅ Now inside Client Component

  // ✅ Hide search bar on listing pages
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showSearchBar = !pathname.startsWith("/confirm-reservation");

  return (
    <div className="fixed w-full bg-white dark:bg-gray-800 z-10 shadow-sm">
      <div className="py-3">
        <Container>
          <div className="flex flex-row items-center justify-between gap-3 md:gap-0">
            <Logo />
            <Search /> {/* ✅ Conditionally render search bar */}
            <div className="flex flex-row items-center gap-3">
              <ThemeSwitcher />
              <UserMenu currentUser={currentUser} />
            </div>
          </div>
        </Container>
      </div>
      <Categories />
    </div>
  );
};

export default Navbar;
