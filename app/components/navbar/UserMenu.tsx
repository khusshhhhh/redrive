"use client";

import { AiOutlineMenu } from "react-icons/ai";
import Avatar from "../Avatar";
import { useCallback, useEffect, useRef, useState } from "react";
import MenuItem from "./MenuItem";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import useRentModal from "@/app/hooks/useRentModal";
import { signOut } from "next-auth/react";
import { SafeUser } from "@/app/types";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  currentUser?: SafeUser | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser }) => {
  const router = useRouter();
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const rentModal = useRentModal();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Toggle menu open/close
  const toggleOpen = useCallback(() => {
    setIsOpen((value) => !value);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close menu when clicking a menu item
  const closeMenu = () => {
    setIsOpen(false);
  };

  const onRent = useCallback(() => {
    if (!currentUser) {
      return loginModal.onOpen();
    }
    rentModal.onOpen();
    closeMenu();
  }, [currentUser, loginModal, rentModal]);

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex flex-row items-center gap-3">
        <div
          onClick={onRent}
          className="hidden md:block text-sm font-semibold py-3 px-4 bg-teal-500 rounded-full hover:bg-teal-400 text-white transition cursor-pointer"
        >
          Add your items
        </div>
        <div
          onClick={toggleOpen}
          className="p-4 md:py-1 md:px-2 border-[1px] border-neutral-200 flex flex-row items-center gap-3 rounded-full cursor-pointer hover:shadow-md transition"
        >
          <AiOutlineMenu />
          <div className="hidden md:block">
            <Avatar src={currentUser?.image} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute rounded-xl shadow-md w-[44vw] md:w-52 bg-white overflow-hidden right-0 top-12 text-sm">
          <div className="flex flex-col cursor-pointer">
            {currentUser && (
              <div
                onClick={() => { router.push("/profile"); closeMenu(); }}
                className="px-8 py-3 text-left text-sm font-bold text-black hover:bg-gray-100 transition cursor-pointer"
              >
                {currentUser.name}
              </div>
            )}
            <hr />
            {currentUser ? (
              <>
                <MenuItem onClick={() => { rentModal.onOpen(); closeMenu(); }} label="Add your items" />
                <MenuItem onClick={() => { router.push("/trips"); closeMenu(); }} label="Bookings" />
                <MenuItem onClick={() => { router.push("/reservations"); closeMenu(); }} label="Reservations" />
                <MenuItem onClick={() => { router.push("/favorites"); closeMenu(); }} label="Favourites" />
                <MenuItem onClick={() => { router.push("/properties"); closeMenu(); }} label="Utilities" />
                {/* <MenuItem onClick={() => { router.push("/profile"); closeMenu(); }} label="Profile" /> */}
                <hr />
                <MenuItem onClick={() => { signOut(); closeMenu(); }} label="Logout" />
              </>
            ) : (
              <>
                <MenuItem onClick={() => { loginModal.onOpen(); closeMenu(); }} label="Login" />
                <hr />
                <MenuItem onClick={() => { registerModal.onOpen(); closeMenu(); }} label="Sign Up" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
