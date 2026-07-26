"use client";

import { useEffect } from "react";
import axios from "axios";

const HEARTBEAT_INTERVAL_MS = 25000;

/**
 * Sends a lightweight "I'm active" heartbeat while the app is open, so
 * other users see accurate online/last-seen status app-wide — not just
 * while a chat happens to be open. Pass `enabled` based on whether there's
 * a logged-in user (the app has no client-side session context/provider
 * set up, so this is driven by the server-fetched `currentUser` instead of
 * next-auth's `useSession`, which would need one).
 */
export default function usePresence(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const ping = () => {
      if (document.visibilityState === "visible") {
        axios.post("/api/presence").catch(() => {
          // Best-effort; a missed heartbeat just means presence looks
          // slightly stale, nothing user-facing needs to handle it.
        });
      }
    };

    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [enabled]);
}
