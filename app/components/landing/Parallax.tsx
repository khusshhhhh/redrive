"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ParallaxProps {
  children: ReactNode;
  /** Pixels of travel across the element's time in the viewport. Negative = up. */
  distance?: number;
  className?: string;
}

/**
 * Translates its child on the Y axis as the page scrolls, proportional to how
 * far the element has moved through the viewport. rAF-throttled, only active
 * while on screen, and a no-op under `prefers-reduced-motion`.
 */
export default function Parallax({ children, distance = -40, className = "" }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let visible = false;

    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // progress: 0 when the element enters the bottom, 1 when it leaves the top
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      node.style.transform = `translate3d(0, ${(progress - 0.5) * distance * 2}px, 0)`;
    };

    const onScroll = () => {
      if (!visible || raf) return;
      raf = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) onScroll();
    });
    observer.observe(node);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      node.style.transform = "";
    };
  }, [distance]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
