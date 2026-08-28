"use client";

import { getSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import toast from "@/app/libs/toast";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import {
  clearBrowserActivity,
  readBrowserActivity,
  recordBrowserActivity,
  WEB_ACTIVITY_STORAGE_KEY,
} from "@/app/libs/browserSessionActivity";

const SERVER_TOUCH_THROTTLE_MS = 60_000;
const SESSION_BOOTSTRAP_RETRY_MS = 1_000;
const SESSION_BOOTSTRAP_MAX_RETRIES = 3;
const VERIFY_THROTTLE_MS = 1_000;

function storedActivity() {
  return readBrowserActivity(window.localStorage);
}

export default function IdleSessionGuard({
  idleTimeoutMs,
}: {
  idleTimeoutMs: number;
}) {
  const { isAuthenticated } = useCurrentUser();

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
    let bootstrapRetries = 0;
    let lastVerify = 0;
    let timeout: number | undefined;
    let bootstrapRetryTimeout: number | undefined;

    const logoutForInactivity = async () => {
      if (disposed || logoutStarted) return;
      logoutStarted = true;
      clearBrowserActivity(window.localStorage);
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
      recordBrowserActivity(window.localStorage, now);
      scheduleLogout();
      if (!force && now - lastServerTouch < SERVER_TOUCH_THROTTLE_MS) return;
      lastServerTouch = now;
      try {
        const response = await fetch("/api/auth/activity", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Cache-Control": "no-store" },
        });
        if (response.ok) {
          bootstrapRetries = 0;
          return;
        }
        if (response.status === 409) {
          lastServerTouch = 0;
          if (bootstrapRetries < SESSION_BOOTSTRAP_MAX_RETRIES) {
            bootstrapRetries += 1;
            if (bootstrapRetryTimeout) window.clearTimeout(bootstrapRetryTimeout);
            bootstrapRetryTimeout = window.setTimeout(
              () => void touchServer(true),
              SESSION_BOOTSTRAP_RETRY_MS,
            );
          }
          return;
        }
        if (response.status === 401) {
          // The credentials callback and the first activity request can overlap
          // while the refreshed JWT cookie is being committed. Never destroy a
          // freshly authenticated session solely because that touch raced it.
          const session = await getSession().catch(() => null);
          const sessionIsValid = Boolean(
            session?.user?.email && !session.sessionInvalidReason,
          );
          if (!sessionIsValid) {
            await logoutForInactivity();
            return;
          }
          lastServerTouch = 0;
          if (bootstrapRetries < SESSION_BOOTSTRAP_MAX_RETRIES) {
            bootstrapRetries += 1;
            if (bootstrapRetryTimeout) window.clearTimeout(bootstrapRetryTimeout);
            bootstrapRetryTimeout = window.setTimeout(
              () => void touchServer(true),
              SESSION_BOOTSTRAP_RETRY_MS,
            );
          }
        }
      } catch {
        // A temporary network failure must not destroy a valid local session.
        // The next activity or authenticated request will retry validation.
      }
    };

    const verifyThenTouch = async () => {
      // Returning to the tab fires both focus and visibilitychange, and each
      // forced touch skips the throttle. Two pings landing together are wasted
      // work, so the second one is dropped.
      const now = Date.now();
      if (now - lastVerify < VERIFY_THROTTLE_MS) return;
      lastVerify = now;

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
      if (event.key === WEB_ACTIVITY_STORAGE_KEY) scheduleLogout();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void verifyThenTouch();
    };

    if (isAuthenticated) {
      // Authentication itself is activity. Reset synchronously before any
      // asynchronous session bootstrap request can race with an old timestamp.
      recordBrowserActivity(window.localStorage);
      scheduleLogout();
      window.addEventListener("pointerdown", onActivity, { passive: true });
      window.addEventListener("keydown", onActivity);
      window.addEventListener("wheel", onActivity, { passive: true });
      window.addEventListener("touchstart", onActivity, { passive: true });
      window.addEventListener("focus", onVisibilityChange);
      window.addEventListener("storage", onStorage);
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    void verifyThenTouch();

    return () => {
      disposed = true;
      if (timeout) window.clearTimeout(timeout);
      if (bootstrapRetryTimeout) window.clearTimeout(bootstrapRetryTimeout);
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
