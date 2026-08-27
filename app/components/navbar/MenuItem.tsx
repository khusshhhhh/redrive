"use client";

import React from "react";
import { IconChevronRight } from "@tabler/icons-react";

interface MenuItemProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  /** Short hint shown under the label. */
  hint?: string;
  /** Trailing badge (e.g. an unread count). */
  badge?: React.ReactNode;
  /** Accent CTA row — filled, sits at the top of the menu. */
  variant?: "default" | "cta" | "danger";
  /** Stagger index for the open animation. */
  index?: number;
}

const MenuItem: React.FC<MenuItemProps> = ({
  onClick,
  label,
  icon,
  hint,
  badge,
  variant = "default",
  index = 0,
}) => {
  const isCta = variant === "cta";
  const isDanger = variant === "danger";

  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      style={{ animationDelay: `${40 + index * 26}ms` }}
      className={`group menu-item-in relative flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 ${
        isCta
          ? "bg-primary text-white hover:bg-primary-active"
          : isDanger
            ? "text-error hover:bg-error/5"
            : "text-ink hover:bg-surface-soft"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
          isCta
            ? "border-white/25 bg-white/10 text-white"
            : isDanger
              ? "border-error/25 bg-error/5 text-error"
              : "border-hairline bg-white text-ink group-hover:border-border-strong"
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{label}</span>
          {badge}
        </span>
        {hint && (
          <span
            className={`mt-0.5 block truncate text-xs ${
              isCta ? "text-white/70" : "text-muted"
            }`}
          >
            {hint}
          </span>
        )}
      </span>

      <IconChevronRight
        size={16}
        className={`shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 ${
          isCta ? "text-white" : isDanger ? "text-error" : "text-muted"
        }`}
      />
    </button>
  );
};

export default MenuItem;
