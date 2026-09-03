"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/app/types";

// Broadcast this after a client-side sign-in (credential login uses
// `redirect: false`, so there is no navigation to remount the tree). Sign-out
// and OAuth already do a full document navigation, which remounts the provider.
export const AUTH_CHANGED_EVENT = "redrive:auth-changed";

interface CurrentUserContextValue {
  currentUser: SessionUser | null;
  /** True until the first `/api/me` response resolves. */
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Re-fetch `/api/me` (e.g. after a profile edit). */
  refresh: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export default function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    // Coalesce concurrent triggers (mount + focus + auth event) into one request.
    if (inFlight.current) return inFlight.current;

    const request = (async () => {
      try {
        const response = await fetch("/api/me", {
          credentials: "same-origin",
          headers: { "Cache-Control": "no-store" },
        });
        if (!response.ok) {
          setCurrentUser(null);
          return;
        }
        const data = (await response.json()) as { currentUser: SessionUser | null };
        setCurrentUser(data.currentUser ?? null);
      } catch {
        // Network blip — keep the last known value rather than flapping the UI.
      } finally {
        setIsLoading(false);
        inFlight.current = null;
      }
    })();

    inFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    void refresh();

    const onAuthChanged = () => void refresh();
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return (
    <CurrentUserContext.Provider
      value={{
        currentUser,
        isLoading,
        isAuthenticated: !!currentUser,
        refresh,
      }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return context;
}

/** Fire-and-forget helper for post-login code paths that have no navigation. */
export function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}
