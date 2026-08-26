"use client";

import { getSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import toast from "react-hot-toast";

const ACTIVITY_STORAGE_KEY = "redrive:web-session:last-activity";
const SERVER_TOUCH_THROTTLE_MS = 60_000;

function storedActivity() {
  const value = Number(window.localStorage.getItem(ACTIVITY_STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export default function IdleSessionGuard({
  isAuthenticated,
  idleTimeoutMs,
}: {
  isAuthenticated: boolean;
  idleTimeoutMs: number;
}) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("session") === "inactive") {
      toast.error(`You were signed out after ${Math.round(idleTimeoutMs / 60_000)} minutes of inactivity.`);
      url.searchParams.delete("session");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [idleTimeoutMs]);

  useEffect(() => {
    let disposed = false;
    let logoutStarted = false;
    let lastServerTouch = 0;
    let timeout: number | undefined;

    const logoutForInactivity = async () => {
      if (disposed || logoutStarted) return;
      logoutStarted = true;
      window.localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      await signOut({ callbackUrl: "/?session=inactive" });
    };

    const scheduleLogout = () => {
      if (timeout) window.clearTimeout(timeout);
      const lastActivity = storedActivity();
      const remaining = lastActivity ? idleTimeoutMs - (Date.now() - lastActivity) : idleTimeoutMs;
      timeout = window.setTimeout(() => {
        const latestActivity = storedActivity();
        if (!latestActivity || Date.now() - latestActivity >= idleTimeoutMs) {
          void logoutForInactivity();
        } else {
          scheduleLogout();
        }
      }, Math.max(1_000, remaining));
    };

    const touchServer = async (force = false) => {
      if (!isAuthenticated || disposed || logoutStarted) return;
      const now = Date.now();
      window.localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
      scheduleLogout();
      if (!force && now - lastServerTouch < SERVER_TOUCH_THROTTLE_MS) return;
      lastServerTouch = now;
      try {
        const response = await fetch("/api/auth/activity", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Cache-Control": "no-store" },
        });
        if (response.status === 401) await logoutForInactivity();
      } catch {
        // A temporary network failure must not destroy a valid local session.
        // The next activity or authenticated request will retry validation.
      }
    };

    const verifyThenTouch = async () => {
      const session = await getSession().catch(() => null);
      if (disposed) return;
      if (session?.sessionInvalidReason || (session && !session.user?.email)) {
        await logoutForInactivity();
        return;
      }
      if (isAuthenticated && session) await touchServer(true);
    };

    const onActivity = () => void touchServer();
    const onStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_STORAGE_KEY) scheduleLogout();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void verifyThenTouch();
    };

    void verifyThenTouch();
    if (isAuthenticated) {
      window.addEventListener("pointerdown", onActivity, { passive: true });
      window.addEventListener("keydown", onActivity);
      window.addEventListener("wheel", onActivity, { passive: true });
      window.addEventListener("touchstart", onActivity, { passive: true });
      window.addEventListener("focus", onVisibilityChange);
      window.addEventListener("storage", onStorage);
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      disposed = true;
      if (timeout) window.clearTimeout(timeout);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("wheel", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("focus", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [idleTimeoutMs, isAuthenticated]);

  return null;
}
