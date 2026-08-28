"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { IconStarFilled } from "@tabler/icons-react";

interface StarRatingProps {
  /** Current committed value, 0–`count`. Fractional values render partial fills. */
  value: number;
  /** Provide to make the widget interactive. Omit for a read-only display. */
  onChange?: (value: number) => void;
  /** Step for interactive input. */
  precision?: 0.5 | 1;
  /** Number of stars. */
  count?: number;
  /** Star size in px. */
  size?: number;
  className?: string;
  label?: string;
  disabled?: boolean;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function StarRating({
  value,
  onChange,
  precision = 1,
  count = 5,
  size = 20,
  className = "",
  label = "Rating",
  disabled = false,
}: StarRatingProps) {
  const interactive = Boolean(onChange) && !disabled;
  const [hover, setHover] = useState<number | null>(null);
  const [justCommitted, setJustCommitted] = useState(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupId = useId();

  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
  }, []);

  // Hover previews ahead of the cursor; when the pointer leaves without a click
  // the display snaps back to the committed value.
  const shown = hover ?? value;

  const commit = (next: number) => {
    const clamped = clamp(Number(next.toFixed(1)), 0, count);
    onChange?.(clamped);
    setJustCommitted(true);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => setJustCommitted(false), 350);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = clamp(value + precision, 0, count);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = clamp(value - precision, 0, count);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count;
        break;
      default:
        if (/^[1-9]$/.test(event.key)) next = clamp(Number(event.key), 0, count);
    }
    if (next !== null) {
      event.preventDefault();
      commit(next);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${interactive ? "cursor-pointer" : ""} ${className}`}
      role={interactive ? "slider" : "img"}
      aria-label={interactive ? label : `${label}: ${value.toFixed(1)} out of ${count}`}
      aria-valuenow={interactive ? value : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? count : undefined}
      aria-valuetext={interactive ? `${value} out of ${count}` : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeyDown}
      onMouseLeave={() => interactive && setHover(null)}
    >
      {Array.from({ length: count }, (_, i) => {
        const pct = clamp((shown - i) * 100, 0, 100);
        return (
          <span
            key={`${groupId}-${i}`}
            className="relative inline-block shrink-0 leading-none"
            style={{ width: size, height: size }}
          >
            <IconStarFilled size={size} className="absolute inset-0 text-hairline" aria-hidden="true" />
            <span
              className="star-fill absolute inset-0 overflow-hidden text-ink"
              style={{
                width: `${pct}%`,
                "--star-stagger": justCommitted ? `${i * 35}ms` : "0ms",
              } as React.CSSProperties}
            >
              <IconStarFilled size={size} className="text-ink" aria-hidden="true" />
            </span>

            {interactive && (
              <>
                {precision === 0.5 && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`${i + 0.5} stars`}
                    className="absolute inset-y-0 left-0 z-10 w-1/2"
                    onMouseEnter={() => setHover(i + 0.5)}
                    onClick={() => commit(i + 0.5)}
                  />
                )}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
                  className={`absolute inset-y-0 z-10 ${precision === 0.5 ? "left-1/2 w-1/2" : "inset-x-0 w-full"}`}
                  onMouseEnter={() => setHover(i + 1)}
                  onClick={() => commit(i + 1)}
                />
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}
