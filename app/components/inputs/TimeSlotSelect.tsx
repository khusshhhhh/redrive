"use client";

import { useId, useMemo } from "react";
import { Clock3 } from "lucide-react";
import {
  effectivePickupWindow,
  formatTimeOfDay,
  isValidTimeOfDay,
  timeSlots,
} from "@/app/libs/bookingTimes";

interface Props {
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** When set, slots are bounded by the (effective) pickup window. */
  windowStart?: string | null;
  windowEnd?: string | null;
  /** Skip the window bounds — full-day 30-min grid (used for the return time). */
  fullDay?: boolean;
  hint?: string;
  disabled?: boolean;
}

/**
 * A 30-minute-slot picker. Clearer than a native `<input type="time">`:
 * the choices are pre-bounded to the host's window and every option is a
 * legible label. The current value is always selectable even if it's
 * off-grid or outside the window (shown with a marker).
 */
export default function TimeSlotSelect({
  label,
  value,
  onChange,
  windowStart,
  windowEnd,
  fullDay,
  hint,
  disabled,
}: Props) {
  const id = useId();

  const options = useMemo(() => {
    const base = fullDay
      ? timeSlots("00:00", "23:30")
      : timeSlots(windowStart, windowEnd);
    const set = new Set(base);
    if (isValidTimeOfDay(value) && !set.has(value)) {
      base.push(value);
      base.sort((a, b) => a.localeCompare(b));
    }
    const win = fullDay ? null : effectivePickupWindow(windowStart, windowEnd);
    return base.map((slot) => {
      const outside =
        win &&
        // mark values that landed outside the window (e.g. a host override)
        !timeSlots(win.start, win.end).includes(slot);
      return { slot, label: `${formatTimeOfDay(slot)}${outside ? " · outside window" : ""}` };
    });
  }, [value, windowStart, windowEnd, fullDay]);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <Clock3
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <select
          id={id}
          value={isValidTimeOfDay(value) ? value : ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-md border border-hairline bg-surface-soft/50 pl-9 pr-9 text-sm font-medium text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
        >
          {!isValidTimeOfDay(value) && <option value="">Choose a time</option>}
          {options.map((option) => (
            <option key={option.slot} value={option.slot}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">▾</span>
      </div>
      {hint && <p className="mt-1.5 text-xs leading-5 text-muted">{hint}</p>}
    </div>
  );
}
