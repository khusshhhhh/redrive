"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import Button from "../Button";

// Shared scroll-lock ref-count. Login and Register both render an AuthShell and
// can briefly overlap while toggling between them; the count keeps the page
// locked until the last one closes and restores the original inline value.
let locks = 0;
let previousOverflow = "";
const lock = () => {
  if (locks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks += 1;
};
const unlock = () => {
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = "";
  }
};

export interface RailPoint {
  icon: ReactNode;
  text: string;
}

interface AuthShellProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  /** Small label above the title, e.g. "Step 2 of 3". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel: string;
  loading?: boolean;
  disabled?: boolean;
  onBack?: () => void;
  backLabel?: string;
  /** 1–3, renders the signup progress bar in the header. */
  progress?: number;
  progressTotal?: number;
  children: ReactNode;
  /** Rendered under the primary action — divider, Google, toggle link. */
  belowAction?: ReactNode;
  railHeadline: string;
  railPoints: RailPoint[];
}

export default function AuthShell({
  isOpen,
  onClose,
  onSubmit,
  eyebrow,
  title,
  subtitle,
  actionLabel,
  loading = false,
  disabled = false,
  onBack,
  backLabel = "Back",
  progress,
  progressTotal = 3,
  children,
  belowAction,
  railHeadline,
  railPoints,
}: AuthShellProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    lock();
    return unlock;
  }, [isOpen]);

  const close = useCallback(() => {
    if (disabled) return;
    setShown(false);
    setTimeout(onClose, 200);
  }, [disabled, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen && !shown) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overflow-x-hidden bg-black/45 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none sm:items-center sm:p-6 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={close}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`relative flex w-full max-h-[94dvh] flex-col overflow-hidden bg-white shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none sm:max-h-[calc(100dvh-96px)] sm:max-w-[880px] sm:rounded-2xl md:flex-row ${
          shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 sm:translate-y-3"
        } rounded-t-3xl`}
      >
        {/* Mobile drag handle */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-2 z-20 h-1 w-10 -translate-x-1/2 rounded-full bg-white/40 md:hidden"
        />

        {/* Brand rail */}
        <aside className="shrink-0 bg-primary px-6 pb-5 pt-7 text-white sm:px-8 md:w-[300px] md:py-9">
          <div className="flex items-end gap-0.5" role="img" aria-label="Redrive">
            <span aria-hidden="true" className="login-wordmark text-2xl font-bold tracking-[-0.045em]">
              redrive
            </span>
            <span aria-hidden="true" className="mb-0.5 text-xl font-bold leading-none text-accent">
              .
            </span>
          </div>
          <p className="mt-3 max-w-[38ch] text-sm font-medium leading-6 text-white/85 md:mt-5 md:text-[15px]">
            {railHeadline}
          </p>
          <ul className="mt-4 hidden space-y-3 md:block">
            {railPoints.map((point) => (
              <li key={point.text} className="flex items-start gap-2.5 text-xs leading-5 text-white/70">
                <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent">
                  {point.icon}
                </span>
                {point.text}
              </li>
            ))}
          </ul>
          <div className="signup-road mt-5 hidden h-0.5 w-full opacity-50 md:block" aria-hidden="true" />
        </aside>

        {/* Content column */}
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center gap-3 px-6 pb-2 pt-5 sm:px-8 sm:pt-6">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={disabled}
                className="-ml-2 inline-flex h-9 items-center gap-1 rounded-sm px-2 text-xs font-semibold text-muted transition hover:text-ink disabled:opacity-50"
              >
                ← {backLabel}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Close dialog"
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={18} />
            </button>
          </header>

          <div className="px-6 sm:px-8">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
            )}
            <h2 id="auth-modal-title" className="mt-1 text-xl font-semibold text-ink sm:text-2xl">
              {title}
            </h2>
            {subtitle && <p className="mt-1.5 text-sm leading-6 text-muted">{subtitle}</p>}
            {typeof progress === "number" && (
              <div
                className="mt-4 flex items-center gap-1.5"
                aria-label={`Step ${progress} of ${progressTotal}`}
              >
                {Array.from({ length: progressTotal }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      index < progress ? "bg-primary" : "bg-hairline-soft"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex-auto overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">{children}</div>

          <div className="safe-bottom sticky bottom-0 z-10 border-t border-hairline-soft bg-white px-6 pb-5 pt-3 sm:px-8">
            <Button disabled={disabled} loading={loading} label={actionLabel} onClick={onSubmit} />
            {belowAction}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
