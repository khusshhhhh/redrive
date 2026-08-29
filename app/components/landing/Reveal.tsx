"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

interface RevealProps {
  children: ReactNode;
  /** ms delay before the transition starts — used to stagger siblings. */
  delay?: number;
  className?: string;
  as?: ElementType;
  /** Direction the content travels in from as it reveals. */
  from?: "up" | "left" | "right" | "zoom";
  /** Reveal only once (default) or every time it re-enters the viewport. */
  once?: boolean;
}

const FROM_CLASS: Record<NonNullable<RevealProps["from"]>, string> = {
  up: "",
  left: "reveal-left",
  right: "reveal-right",
  zoom: "reveal-zoom",
};

/**
 * Scroll-triggered entrance wrapper. The content sits shifted and transparent
 * until it scrolls into view, then eases into place. Honours
 * `prefers-reduced-motion` via the `.reveal-on-scroll` rules in globals.css.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as,
  from = "up",
  once = true,
}: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setRevealed(false);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      style={{ "--reveal-delay": delay ? `${delay}ms` : undefined } as CSSProperties}
      className={`reveal-on-scroll ${FROM_CLASS[from]} ${revealed ? "is-revealed" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
