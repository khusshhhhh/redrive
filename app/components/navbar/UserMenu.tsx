"use client";

import Avatar from "../Avatar";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import MenuItem from "./MenuItem";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import useRentModal from "@/app/hooks/useRentModal";
import { signOut } from "next-auth/react";
import { SafeUser } from "@/app/types";
import { useRouter } from "next/navigation";
import { IconBrandDatabricks, IconCalendar, IconClipboardPlus, IconFilePlus, IconHearts, IconLocationCheck, IconLogin2, IconLogout2, IconMenu3, IconUserEdit, IconMessage } from "@tabler/icons-react";

interface UserMenuProps {
  currentUser?: SafeUser | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser }) => {
  const router = useRouter();
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const rentModal = useRentModal();
  const [isOpen, setIsOpen] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Toggle menu open/close
  const toggleOpen = useCallback(() => {
    setIsOpen((value) => !value);
  }, []);

  // Check if there are any messages
  useEffect(() => {
    if (!currentUser) return;
    axios
      .get('/api/chats')
      .then((res) => setHasMessages(res.data.length > 0))
      .catch(() => setHasMessages(false));
  }, [currentUser]);

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
          className="py-2 px-3 border-[1px] border-neutral-300 flex flex-row items-center gap-3 rounded-full cursor-pointer hover:shadow-md transition"
        >
          <IconMenu3 />
          <div className="hidden md:block">
            <Avatar src={currentUser?.image} showBadge={hasMessages} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute rounded-xl shadow-md w-72 md:w-52 bg-white overflow-hidden right-0 top-12 text-sm">
          <div className="flex flex-col cursor-pointer">
            {currentUser && (
              <div
                onClick={() => { router.push("/profile"); closeMenu(); }}
                className="flex flex-row gap-3 px-8 py-5 text-left text-sm font-bold text-black hover:bg-gray-100 transition cursor-pointer"
              >
                <div>
                  <IconUserEdit size={18} />
                </div>
                <div>
                  {currentUser.name}
                </div>
              </div>
            )}
            <hr />
            {currentUser ? (
              <>
                <MenuItem onClick={() => { rentModal.onOpen(); closeMenu(); }} label="Add your items" icon={<IconFilePlus size={18} className="text-black" />} />
                <MenuItem onClick={() => { router.push("/trips"); closeMenu(); }} label="Bookings" icon={<IconLocationCheck size={18} className="text-black" />} />
                <MenuItem onClick={() => { router.push("/reservations"); closeMenu(); }} label="Reservations" icon={<IconCalendar size={18} className="text-black" />} />
                <MenuItem onClick={() => { router.push("/favorites"); closeMenu(); }} label="Favourites" icon={<IconHearts size={18} className="text-black" />} />
                <MenuItem onClick={() => { router.push("/properties"); closeMenu(); }} label="My Utilities" icon={<IconBrandDatabricks size={18} className="text-black" />} />
                <MenuItem onClick={() => { router.push("/messages"); closeMenu(); }} label="Messages" icon={<IconMessage size={18} className="text-black" />} />
                {/* <MenuItem onClick={() => { router.push("/profile"); closeMenu(); }} label="Profile" /> */}
                <hr />
                <MenuItem onClick={() => { signOut(); closeMenu(); }} label="Logout" icon={<IconLogout2 size={18} className="text-black" />} />
              </>
            ) : (
              <>
                <MenuItem onClick={() => { loginModal.onOpen(); closeMenu(); }} label="Login" icon={<IconLogin2 size={18} className="text-black" />} />
                <hr />
                <MenuItem onClick={() => { registerModal.onOpen(); closeMenu(); }} label="Sign Up" icon={<IconClipboardPlus size={18} className="text-black" />} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
