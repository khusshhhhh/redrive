import type { CSSProperties, ElementType, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** ms delay before the fade starts — used to stagger siblings a little. */
  delay?: number;
  className?: string;
  as?: ElementType;
  /** Kept for call-site compatibility; no longer changes the motion. */
  from?: "up" | "left" | "right" | "zoom";
  once?: boolean;
}

/**
 * A plain entrance wrapper: the content fades and lifts in once, on load.
 * No scroll observers, no scroll-timeline — just a short CSS animation.
 * Honours `prefers-reduced-motion` via the `.fade-in` rule in globals.css.
 */
export default function Reveal({ children, delay = 0, className = "", as }: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      style={{ animationDelay: delay ? `${delay}ms` : undefined } as CSSProperties}
      className={`fade-in ${className}`}
    >
      {children}
    </Tag>
  );
}
