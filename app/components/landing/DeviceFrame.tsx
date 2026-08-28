"use client";

import type { ReactNode } from "react";

/**
 * Static device chrome for the composed app screenshots on the landing page.
 * Purely presentational — the real app UI is rendered inside `children`.
 */

export function PhoneFrame({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`device-phone relative aspect-[9/19] w-[220px] shrink-0 border border-white/60 bg-graphite p-[10px] sm:w-[248px] ${className}`}
      role="img"
      aria-label={label ?? "Redrive mobile app screen"}
    >
      <div className="absolute left-1/2 top-[14px] z-20 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-black/85" />
      <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-white">
        {children}
      </div>
    </div>
  );
}

export function BrowserFrame({
  children,
  className = "",
  url = "redrive.com.au/explore",
  label,
}: {
  children: ReactNode;
  className?: string;
  url?: string;
  label?: string;
}) {
  return (
    <div
      className={`device-browser overflow-hidden rounded-2xl border border-hairline bg-white ${className}`}
      role="img"
      aria-label={label ?? "Redrive web app screen"}
    >
      <div className="flex items-center gap-2 border-b border-hairline-soft bg-surface-soft/80 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="ml-3 hidden truncate rounded-full bg-white px-3 py-1 text-[11px] font-medium text-muted sm:block">
          {url}
        </span>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
