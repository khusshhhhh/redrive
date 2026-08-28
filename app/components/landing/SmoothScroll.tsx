"use client";

import { useEffect } from "react";

/**
 * A small in-house smooth-scroll for the landing page — no third-party runtime.
 *
 * It intercepts wheel input and eases `window.scrollTo` toward a target on every
 * animation frame, giving a slow, weighted glide. It deliberately does nothing on
 * touch devices (native momentum is already good), when the pointer is coarse, or
 * when the visitor prefers reduced motion. Keyboard, scrollbar dragging and
 * anchor jumps stay native — the loop just re-syncs to wherever they land.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const root = document.documentElement;

    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    // Ease factor: lower = slower, heavier glide.
    const EASE = 0.5;

    let target = window.scrollY;
    let current = target;
    let rafId = 0;
    let running = false;
    let selfScrolling = false;

    const maxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const tick = () => {
      const delta = target - current;
      if (Math.abs(delta) < 0.4) {
        current = target;
        selfScrolling = true;
        window.scrollTo(0, Math.round(current));
        selfScrolling = false;
        running = false;
        return;
      }
      current += delta * EASE;
      selfScrolling = true;
      window.scrollTo(0, current);
      selfScrolling = false;
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    };

    const onWheel = (event: WheelEvent) => {
      // Leave pinch-zoom, modifier gestures and genuinely nested scrollers alone.
      if (event.ctrlKey || event.defaultPrevented) return;
      const scrollableAncestor = (event.target as HTMLElement | null)?.closest?.(
        "[data-native-scroll], .allow-native-scroll",
      );
      if (scrollableAncestor) return;

      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      event.preventDefault();
      target = Math.min(maxScroll(), Math.max(0, target + event.deltaY * unit));
      start();
    };

    const onNativeScroll = () => {
      if (selfScrolling) return;
      // Keyboard / scrollbar / hash navigation moved us — adopt that position.
      target = window.scrollY;
      current = window.scrollY;
    };

    const onResize = () => {
      target = Math.min(target, maxScroll());
    };

    root.classList.add("has-smooth-scroll");
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onNativeScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      root.classList.remove("has-smooth-scroll");
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onNativeScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
