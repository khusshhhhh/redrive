"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import useLoginModal from "@/app/hooks/useLoginModal";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";

const HOST_PATH = "/host";

/**
 * "Become a host" call to action. `/host` is auth-gated by middleware, so an
 * unauthenticated visitor clicking a plain <Link> is bounced to the sign-in
 * page ("/") and appears to land back on the homepage. This opens the login
 * modal instead and sends them to `/host` once they are signed in.
 */
export default function BecomeHostLink({
  children,
  className,
  onNavigate,
}: {
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
  /** Accepted for drop-in parity with <Link>; the target is always `/host`. */
  href?: string;
}) {
  const loginModal = useLoginModal();
  const { currentUser, isLoading } = useCurrentUser();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // While the session is still resolving, let the <Link> navigate and let
    // middleware decide — it redirects authed users straight through.
    if (isLoading) return;
    if (currentUser) {
      onNavigate?.();
      return;
    }
    event.preventDefault();
    onNavigate?.();
    loginModal.onOpen(HOST_PATH);
  };

  return (
    <Link href={HOST_PATH} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
