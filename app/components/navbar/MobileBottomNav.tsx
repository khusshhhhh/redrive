"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCar,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconRoute,
  IconUserCircle,
} from "@tabler/icons-react";

import useLoginModal from "@/app/hooks/useLoginModal";
import { SafeUser } from "@/app/types";

interface MobileBottomNavProps {
  currentUser?: SafeUser | null;
}

const items = [
  { label: "Explore", href: "/", icon: IconCar, public: true },
  { label: "Favourites", href: "/favorites", icon: IconHeart, activeIcon: IconHeartFilled },
  { label: "Trips", href: "/trips", icon: IconRoute },
  { label: "Inbox", href: "/messages", icon: IconMessageCircle },
  { label: "Profile", href: "/profile", icon: IconUserCircle },
];

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentUser }) => {
  const pathname = usePathname();
  const loginModal = useLoginModal();

  // Detail and focused account flows provide their own primary action bar.
  const hideOnFocusedFlow = [
    "/listings/",
    "/confirm-reservation",
    "/admin",
    "/forgot-password",
    "/reset-password",
    "/messages",
  ].some((route) => pathname.startsWith(route));

  if (hideOnFocusedFlow) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/95 px-2 pt-1.5 shadow-[0_-8px_28px_rgba(22, 22, 22,0.08)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = active && item.activeIcon ? item.activeIcon : item.icon;
          const classes = `flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            active ? "text-primary" : "text-muted hover:bg-surface-soft hover:text-ink"
          }`;

          if (!item.public && !currentUser) {
            return (
              <button
                key={item.href}
                type="button"
                className={classes}
                onClick={loginModal.onOpen}
                aria-label={`${item.label} — sign in required`}
              >
                <Icon size={22} stroke={active ? 2 : 1.7} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={classes}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={22} stroke={active ? 2 : 1.7} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
