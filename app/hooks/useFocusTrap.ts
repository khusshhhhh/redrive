"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus management for a modal dialog:
 *  - moves keyboard focus into the dialog when it opens,
 *  - keeps Tab / Shift+Tab cycling inside it,
 *  - pulls focus back if anything outside steals it while it's open,
 *  - restores focus to whatever was focused before (the trigger) on close.
 *
 * Attach the returned ref to the dialog's outermost element and give that
 * element `tabIndex={-1}` so it can hold focus when it has no focusable child.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;

    // Read the node fresh each time — it may not be attached yet on the tick
    // this effect first runs (portals, lazy-loaded modals).
    const focusables = () =>
      Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null,
      );

    const focusFirst = () => {
      const [first] = focusables();
      (first ?? ref.current)?.focus();
    };
    const reclaimIfLost = () => {
      const node = ref.current;
      if (node && !node.contains(document.activeElement)) focusFirst();
    };

    // rAF beats the paint; the 60ms pass covers the modal's own mount; the
    // 250ms pass beats a closing menu/popover that lets focus fall to <body>
    // a few ticks later (only reclaims if focus actually escaped by then).
    const frame = requestAnimationFrame(focusFirst);
    const t1 = window.setTimeout(focusFirst, 60);
    const t2 = window.setTimeout(reclaimIfLost, 250);

    const onFocusIn = (event: FocusEvent) => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener("focusin", onFocusIn);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const node = ref.current;
      if (!node) return;
      const list = focusables();
      if (list.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const current = document.activeElement;
      const outside = !node.contains(current);
      if (event.shiftKey && (current === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown, true);
      returnFocusRef.current?.focus?.();
    };
  }, [active]);

  return ref;
}
