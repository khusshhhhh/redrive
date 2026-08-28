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

/**
 * Wraps content in the `.reveal` scroll animation. Uses a single
 * IntersectionObserver per instance and unobserves once settled (unless
 * `once` is false). SSR renders the pre-animation state, so there is no flash
 * of fully-visible content before hydration.
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
