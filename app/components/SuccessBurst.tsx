"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A one-shot celebratory overlay for a completed milestone — a new listing going
 * live, a booking request sent, a payment secured. It paints a check badge with
 * a couple of expanding rings, shows the message, then calls `onDone` (usually a
 * navigation). Honours prefers-reduced-motion via CSS.
 */
export default function SuccessBurst({
  title,
  subtitle,
  onDone,
  duration = 1750,
}: {
  title: string;
  subtitle?: string;
  onDone?: () => void;
  duration?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!onDone) return;
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [onDone, duration]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="success-burst fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/95 px-6 text-center backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="success-ring" aria-hidden="true" />
        <span className="success-ring success-ring--2" aria-hidden="true" />
        <span className="success-badge relative flex h-[76px] w-[76px] items-center justify-center rounded-full bg-primary text-white">
          <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path className="success-check" d="M4 12.5l5 5L20 6" />
          </svg>
        </span>
      </div>
      <h2 className="success-fade-1 mt-7 text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      {subtitle && <p className="success-fade-2 mt-2 max-w-xs text-sm leading-6 text-muted">{subtitle}</p>}
    </div>,
    document.body,
  );
}
