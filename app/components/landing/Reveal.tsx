"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** ms delay before the element settles — used to stagger siblings. */
  delay?: number;
  /** Direction the element travels from. */
  from?: "up" | "left" | "right" | "zoom";
  className?: string;
  as?: ElementType;
  /** Re-run the animation every time it re-enters the viewport. */
  once?: boolean;
}

const FROM_CLASS: Record<NonNullable<RevealProps["from"]>, string> = {
  up: "",
  left: "reveal-left",
  right: "reveal-right",
  zoom: "reveal-zoom",
};

const supportsScrollTimeline = () =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("animation-timeline: view()");

/**
 * Wraps content in the `.reveal` scroll animation.
 *
 * Where the browser supports scroll-driven animations, the CSS `@supports`
 * block in globals.css scrubs the reveal with scroll position and this
 * component stays out of the way. Otherwise it falls back to a single
 * IntersectionObserver that toggles `.is-revealed`, with a timed backstop so
 * content is never left stuck hidden.
 */
export default function Reveal({
  children,
  delay = 0,
  from = "up",
  className = "",
  as,
  once = true,
}: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // CSS scroll-driven animation owns the reveal — nothing to do here.
    if (supportsScrollTimeline()) return;

    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setRevealed(false);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    observer.observe(node);

    // Backstop: never leave content stuck hidden if the observer misfires.
    const failSafe = window.setTimeout(() => setRevealed(true), 1800);

    return () => {
      observer.disconnect();
      window.clearTimeout(failSafe);
    };
  }, [once]);

  return (
    <Tag
      ref={ref}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={`reveal ${FROM_CLASS[from]} ${revealed ? "is-revealed" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
