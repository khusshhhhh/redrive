"use client";

import Avatar from "../Avatar";
import { useCallback, useEffect, useRef, useState } from "react";
import MenuItem from "./MenuItem";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import useRentModal from "@/app/hooks/useRentModal";
import { signOut } from "next-auth/react";
import { SafeUser } from "@/app/types";
import { useRouter } from "next/navigation";
import { IconBrandDatabricks, IconCalendar, IconClipboardPlus, IconFilePlus, IconHearts, IconLocationCheck, IconLogin2, IconLogout2, IconMenu3, IconUserEdit, IconMessage } from "@tabler/icons-react";
import NotificationBell from "@/app/components/notifications/NotificationBell";
import ThemeToggle from "./ThemeToggle";

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
          className="hidden md:block text-sm font-semibold py-3 px-4 bg-limespark rounded-full hover:opacity-90 text-graphite transition cursor-pointer"
        >
          Add your items
        </div>
        <ThemeToggle />
        {currentUser && <NotificationBell />}
        <div
          onClick={toggleOpen}
          className="py-2 px-3 border-[1px] border-neutral-300 dark:border-neutral-600 flex flex-row items-center gap-3 rounded-full cursor-pointer hover:shadow-md transition text-black dark:text-neutral-100"
        >
          <IconMenu3 />
          <div className="hidden md:block">
            <Avatar src={currentUser?.image} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute rounded-xl shadow-md w-72 md:w-52 bg-white dark:bg-neutral-800 overflow-hidden right-0 top-12 text-sm">
          <div className="flex flex-col cursor-pointer">
            {currentUser && (
              <div
                onClick={() => { router.push("/profile"); closeMenu(); }}
                className="flex flex-row gap-3 px-8 py-5 text-left text-sm font-bold text-black dark:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-700 transition cursor-pointer"
              >
                <div>
                  <IconUserEdit size={18} />
                </div>
                <div>
                  {currentUser.name}
                </div>
              </div>
            )}
            <hr className="border-neutral-200 dark:border-neutral-700" />
            {currentUser ? (
              <>
                <MenuItem onClick={() => { rentModal.onOpen(); closeMenu(); }} label="Add your items" icon={<IconFilePlus size={18} className="text-black dark:text-neutral-100" />} />
                <MenuItem onClick={() => { router.push("/trips"); closeMenu(); }} label="Bookings" icon={<IconLocationCheck size={18} className="text-black dark:text-neutral-100" />} />
                <MenuItem onClick={() => { router.push("/reservations"); closeMenu(); }} label="Reservations" icon={<IconCalendar size={18} className="text-black dark:text-neutral-100" />} />
                <MenuItem onClick={() => { router.push("/favorites"); closeMenu(); }} label="Favourites" icon={<IconHearts size={18} className="text-black dark:text-neutral-100" />} />
                <MenuItem onClick={() => { router.push("/properties"); closeMenu(); }} label="My Utilities" icon={<IconBrandDatabricks size={18} className="text-black dark:text-neutral-100" />} />
                <MenuItem onClick={() => { router.push("/messages"); closeMenu(); }} label="Messages" icon={<IconMessage size={18} className="text-black dark:text-neutral-100" />} />
                {/* <MenuItem onClick={() => { router.push("/profile"); closeMenu(); }} label="Profile" /> */}
                <hr className="border-neutral-200 dark:border-neutral-700" />
                <MenuItem onClick={() => { signOut(); closeMenu(); }} label="Logout" icon={<IconLogout2 size={18} className="text-black dark:text-neutral-100" />} />
              </>
            ) : (
              <>
                <MenuItem onClick={() => { loginModal.onOpen(); closeMenu(); }} label="Login" icon={<IconLogin2 size={18} className="text-black dark:text-neutral-100" />} />
                <hr className="border-neutral-200 dark:border-neutral-700" />
                <MenuItem onClick={() => { registerModal.onOpen(); closeMenu(); }} label="Sign Up" icon={<IconClipboardPlus size={18} className="text-black dark:text-neutral-100" />} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
