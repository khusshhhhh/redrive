"use client";

import useLoginModal from "@/app/hooks/useLoginModal";

interface SignInLinkProps {
  /** Where to send the user after a successful sign-in. */
  redirectTo?: string;
  label?: string;
  className?: string;
}

/**
 * Opens the login modal from a server-rendered surface (empty states, gated
 * pages) where a plain link can't reach the modal store.
 */
export default function SignInLink({
  redirectTo,
  label = "Sign in",
  className = "mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
}: SignInLinkProps) {
  const loginModal = useLoginModal();
  return (
    <button type="button" onClick={() => loginModal.onOpen(redirectTo)} className={className}>
      {label}
    </button>
  );
}
