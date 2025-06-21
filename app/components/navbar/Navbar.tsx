"use client";

import { usePathname } from "next/navigation"; // ✅ Now used in Client Component
import Container from "../Container";
import Categories from "./Categories";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import { SafeUser } from "@/app/types";
import useLoginModal from "@/app/hooks/useLoginModal";

interface NavbarProps {
  currentUser?: SafeUser | null;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const pathname = usePathname(); // ✅ Now inside Client Component
  const loginModal = useLoginModal();

  // ✅ Hide search bar on listing pages
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showSearchBar = !pathname.startsWith("/confirm-reservation");

  return (
    <div className="fixed w-full bg-white z-10 shadow-sm">
      <div className="py-3">
        <Container>
          <div className="flex flex-row items-center justify-between gap-3 md:gap-0">
            <Logo />
            <Search /> {/* ✅ Conditionally render search bar */}
            {!currentUser && (
              <button
                onClick={loginModal.onOpen}
                className="hidden sm:block text-sm font-semibold py-2 px-4 bg-teal-500 text-white rounded-full hover:bg-teal-400"
              >
                Login
              </button>
            )}
            <UserMenu currentUser={currentUser} />
          </div>
        </Container>
      </div>
      <Categories />
    </div>
  );
};

export default Navbar;
