"use client";

import { useEffect } from "react";

/**
 * Warns before the tab is closed, reloaded, or navigated away from the site
 * while `when` is true — e.g. a part-filled listing draft or an edited profile.
 *
 * This covers browser-level navigation (close, refresh, address bar, external
 * links). The App Router doesn't expose a navigation-abort hook, so in-app
 * route changes aren't intercepted here; keep destructive in-app links (a
 * "Cancel" that routes away) behind their own confirm where it matters.
 */
export default function useUnsavedChangesWarning(when: boolean, message?: string) {
  useEffect(() => {
    if (!when) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Modern browsers show their own generic string; assigning returnValue is
      // still required for the prompt to appear.
      event.returnValue = message ?? "";
      return message ?? "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when, message]);
}
