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
import { IconBrandDatabricks, IconCalendar, IconClipboardPlus, IconFilePlus, IconHearts, IconLocationCheck, IconLogin2, IconLogout2, IconMenu3, IconUserEdit, IconMessage, IconUserCircle } from "@tabler/icons-react";
import NotificationBell from "@/app/components/notifications/NotificationBell";
import Modal from "@/app/components/modals/Modal";

interface UserMenuProps {
  currentUser?: SafeUser | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser }) => {
  const router = useRouter();
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const rentModal = useRentModal();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  const requestLogout = () => {
    closeMenu();
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ callbackUrl: "/" });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <div className="relative z-50" ref={menuRef}>
      <div className="flex flex-row items-center gap-1 sm:gap-2 md:gap-3">
        <div
          onClick={onRent}
          className="hidden md:block text-xs font-medium py-3 px-5 bg-primary rounded-full hover:bg-primary-active text-white transition cursor-pointer"
        >
          List your car
        </div>
        {currentUser && <NotificationBell />}
        <button
          type="button"
          onClick={toggleOpen}
          aria-label={currentUser ? "Open account menu" : "Open sign in menu"}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-full border border-hairline bg-white text-ink outline-none transition hover:border-border-strong hover:shadow-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:h-auto md:w-auto md:min-h-11 md:min-w-11 md:gap-2 md:px-3 md:py-2"
        >
          <IconMenu3 className="hidden md:block" size={18} />
          <div>
            {currentUser?.image ? (
              <Avatar src={currentUser.image} />
            ) : (
              <IconUserCircle className="text-muted" size={30} />
            )}
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-12 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-hairline-soft bg-white text-sm shadow-card md:w-56">
          <div className="flex flex-col cursor-pointer">
            {currentUser && (
              <div
                onClick={() => { router.push("/profile"); closeMenu(); }}
                className="flex flex-row gap-3 px-6 py-4 text-left text-sm font-semibold text-ink hover:bg-surface-soft transition cursor-pointer"
              >
                <div>
                  <IconUserEdit size={18} />
                </div>
                <div>
                  {currentUser.name}
                </div>
              </div>
            )}
            <hr className="border-hairline-soft" />
            {currentUser ? (
              <>
                <MenuItem onClick={() => { rentModal.onOpen(); closeMenu(); }} label="List your car" icon={<IconFilePlus size={18} className="text-ink" />} />
                <MenuItem onClick={() => { router.push("/trips"); closeMenu(); }} label="Bookings" icon={<IconLocationCheck size={18} className="text-ink" />} />
                <MenuItem onClick={() => { router.push("/reservations"); closeMenu(); }} label="Reservations" icon={<IconCalendar size={18} className="text-ink" />} />
                <MenuItem onClick={() => { router.push("/favorites"); closeMenu(); }} label="Favourites" icon={<IconHearts size={18} className="text-favorite" />} />
                <MenuItem onClick={() => { router.push("/properties"); closeMenu(); }} label="My Utilities" icon={<IconBrandDatabricks size={18} className="text-ink" />} />
                <MenuItem onClick={() => { router.push("/messages"); closeMenu(); }} label="Messages" icon={<IconMessage size={18} className="text-ink" />} />
                <hr className="border-hairline-soft" />
                <MenuItem onClick={requestLogout} label="Logout" icon={<IconLogout2 size={18} className="text-ink" />} />
              </>
            ) : (
              <>
                <MenuItem onClick={() => { loginModal.onOpen(); closeMenu(); }} label="Login" icon={<IconLogin2 size={18} className="text-ink" />} />
                <hr className="border-hairline-soft" />
                <MenuItem onClick={() => { registerModal.onOpen(); closeMenu(); }} label="Sign Up" icon={<IconClipboardPlus size={18} className="text-ink" />} />
              </>
            )}
          </div>
        </div>
      )}
      <Modal
        compact
        centered
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onSubmit={() => void confirmLogout()}
        secondaryAction={() => setShowLogoutConfirm(false)}
        secondaryActionLabel="Stay logged in"
        actionLabel="Log out"
        title="Log out of Redrive?"
        disabled={isLoggingOut}
        loading={isLoggingOut}
        body={<p className="pb-4 text-center text-sm leading-6 text-muted">You’ll need to sign in again to manage your trips, listings and messages.</p>}
      />
    </div>
  );
};

export default UserMenu;
