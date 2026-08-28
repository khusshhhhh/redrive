"use client";

import Avatar from "../Avatar";
import { useCallback, useEffect, useRef, useState } from "react";
import MenuItem from "./MenuItem";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import useRentModal from "@/app/hooks/useRentModal";
import { signOut } from "next-auth/react";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { useRouter } from "next/navigation";
import { IconBrandDatabricks, IconCalendar, IconClipboardPlus, IconFilePlus, IconHearts, IconLocationCheck, IconLogin2, IconLogout2, IconMenu3, IconArrowRight, IconMessage, IconUserCircle } from "@tabler/icons-react";
import NotificationBell from "@/app/components/notifications/NotificationBell";
import Modal from "@/app/components/modals/Modal";

interface UserMenuProps {
  prominent?: boolean;
}

const UserMenu: React.FC<UserMenuProps> = ({ prominent = false }) => {
  const { currentUser, isLoading: isSessionLoading } = useCurrentUser();
  const router = useRouter();
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const rentModal = useRentModal();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  // Escape closes the menu and hands focus back to the trigger.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Close menu when clicking a menu item
  const closeMenu = () => {
    setIsOpen(false);
  };

  const go = (path: string) => {
    router.push(path);
    closeMenu();
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

  const firstName = currentUser?.name?.trim().split(/\s+/)[0] ?? "there";

  return (
    <div className="relative z-50" ref={menuRef}>
      <div className="flex flex-row items-center gap-1 sm:gap-2 md:gap-3">
        <button
          type="button"
          onClick={onRent}
          className={`hidden shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-graphite px-5 text-xs font-medium text-white outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:inline-flex ${prominent ? "h-[52px]" : "h-11"}`}
        >
          List your car
        </button>
        {currentUser && <NotificationBell />}
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleOpen}
          disabled={isSessionLoading}
          aria-label={currentUser ? "Open account menu" : "Open sign in menu"}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={`flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-full border bg-white text-ink outline-none transition hover:shadow-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:h-auto md:w-auto md:min-h-11 md:min-w-11 md:gap-2 md:px-3 md:py-2 ${
            isOpen ? "border-border-strong shadow-card" : "border-hairline hover:border-border-strong"
          } ${isSessionLoading ? "cursor-default" : ""}`}
        >
          <IconMenu3 className="hidden md:block" size={18} />
          <div>
            {isSessionLoading ? (
              <span className="block h-[30px] w-[30px] animate-pulse rounded-full bg-hairline" aria-hidden="true" />
            ) : currentUser?.image ? (
              <Avatar src={currentUser.image} alt={`${currentUser.name || "Your"} profile photo`} />
            ) : (
              <IconUserCircle className="text-muted" size={30} />
            )}
          </div>
        </button>
      </div>

      <div
        role="menu"
        aria-label="Account menu"
        className={`absolute right-0 top-[calc(100%+0.75rem)] w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-hairline bg-white text-sm shadow-[0_12px_40px_-8px_rgba(59,59,59,0.28),0_2px_8px_-2px_rgba(59,59,59,0.12)] transition duration-200 motion-reduce:transition-none ${
          isOpen
            ? "visible translate-y-0 scale-100 opacity-100 ease-out"
            : "invisible pointer-events-none -translate-y-1 scale-95 opacity-0 ease-in"
        }`}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        {/* Caret linking the panel to the trigger. */}
        <span className="absolute -top-[7px] right-6 h-3 w-3 rotate-45 border-l border-t border-hairline bg-white" />

        {/* Header */}
        {currentUser ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => go("/profile")}
            className="group relative flex w-full items-center gap-3 overflow-hidden rounded-t-xl border-b border-hairline-soft bg-mist px-4 py-4 text-left outline-none transition hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
          >
            <span className="relative shrink-0 rounded-full bg-ash-ring p-[2px]">
              {currentUser.image ? (
                <Avatar src={currentUser.image} size={40} alt={`${currentUser.name || "Your"} profile photo`} />
              ) : (
                <IconUserCircle className="text-muted" size={40} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{currentUser.name || "Your account"}</span>
              <span className="block truncate text-xs text-muted">{currentUser.email || "View and edit profile"}</span>
            </span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-white text-muted transition-all group-hover:translate-x-0.5 group-hover:border-border-strong group-hover:text-ink">
              <IconArrowRight size={15} />
            </span>
          </button>
        ) : (
          <div className="rounded-t-xl border-b border-hairline-soft bg-mist px-4 py-4">
            <p className="text-sm font-semibold text-ink">Welcome to Redrive</p>
            <p className="mt-0.5 text-xs text-muted">Sign in to book, list and message hosts.</p>
          </div>
        )}

        <div key={isOpen ? "open" : "closed"} className="flex flex-col gap-0.5 p-2">
          {currentUser ? (
            <>
              <MenuItem
                index={0}
                variant="cta"
                onClick={() => { rentModal.onOpen(); closeMenu(); }}
                label="List your car"
                hint="Earn from a vehicle you own"
                icon={<IconFilePlus size={18} />}
              />

              <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-soft">Manage</p>
              <MenuItem index={1} onClick={() => go("/trips")} label="Bookings" icon={<IconLocationCheck size={18} />} />
              <MenuItem index={2} onClick={() => go("/reservations")} label="Reservations" icon={<IconCalendar size={18} />} />
              <MenuItem index={3} onClick={() => go("/properties")} label="My utilities" icon={<IconBrandDatabricks size={18} />} />
              <MenuItem index={4} onClick={() => go("/messages")} label="Messages" icon={<IconMessage size={18} />} />

              <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-soft">Account</p>
              <MenuItem index={5} onClick={() => go("/favorites")} label="Favourites" icon={<IconHearts size={18} />} />

              <hr className="my-1.5 border-hairline-soft" />
              <MenuItem index={6} variant="danger" onClick={requestLogout} label="Log out" icon={<IconLogout2 size={18} />} />
            </>
          ) : (
            <>
              <MenuItem
                index={0}
                variant="cta"
                onClick={() => { loginModal.onOpen(); closeMenu(); }}
                label="Log in"
                hint={`Pick up where ${firstName === "there" ? "you" : firstName} left off`}
                icon={<IconLogin2 size={18} />}
              />
              <MenuItem
                index={1}
                onClick={() => { registerModal.onOpen(); closeMenu(); }}
                label="Create an account"
                hint="Free — takes a minute"
                icon={<IconClipboardPlus size={18} />}
              />
            </>
          )}
        </div>
      </div>

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
