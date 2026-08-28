"use client";

import { useRef, type ReactNode } from "react";

interface TiltProps {
  children: ReactNode;
  /** Max rotation in degrees at the edges. */
  max?: number;
  className?: string;
  /** Show the moving glare highlight. */
  glare?: boolean;
}

/**
 * Pointer-reactive 3D tilt wrapper. Writes `--rx`/`--ry` (and glare position)
 * as CSS custom properties on the inner element; the easing lives in the
 * `.tilt-inner` rule in globals.css. No-ops for reduced-motion visitors.
 */
export default function Tilt({ children, max = 9, className = "", glare = true }: TiltProps) {
  const inner = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const el = inner.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
    });
  };

  const reset = () => {
    const el = inner.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div className={`tilt ${className}`} onPointerMove={handleMove} onPointerLeave={reset}>
      <div ref={inner} className="tilt-inner relative">
        {glare && <span className="tilt-glare" />}
        {children}
      </div>
    </div>
  );
}
