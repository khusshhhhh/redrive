"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerProps {
  id?: string;
  /** ISO date string "yyyy-MM-dd", or "" when nothing is selected. */
  value: string;
  onChange: (value: string) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Month shown first when there is no selection. Defaults to today (or clamped into range). */
  defaultView?: Date;
  className?: string;
  ariaLabel?: string;
}

const WEEK_START = 1; // Monday
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const iso = (d: Date) => format(d, "yyyy-MM-dd");

function parseIso(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? startOfDay(parsed) : null;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mobile;
}

function buildMonthGrid(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_START });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_START });
  const days: Date[] = [];
  for (let d = start; !isAfter(d, end); d = addDays(d, 1)) days.push(d);
  return days;
}

/**
 * Single-date picker styled to match DateRangePicker: a field-style trigger that
 * expands an in-flow calendar panel (desktop) or a full-screen sheet (mobile).
 * The month/year header dropdowns make far-back dates like a birth date quick to
 * reach. Emits an ISO "yyyy-MM-dd" string.
 */
export default function DatePicker({
  id,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select a date",
  disabled,
  error,
  defaultView,
  className = "",
  ariaLabel = "Choose a date",
}: DatePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const gridId = useId();

  const min = useMemo(() => (minDate ? startOfDay(minDate) : null), [minDate]);
  const max = useMemo(() => (maxDate ? startOfDay(maxDate) : null), [maxDate]);
  const selected = useMemo(() => parseIso(value), [value]);

  const clampToRange = useCallback(
    (date: Date) => {
      if (min && isBefore(date, min)) return min;
      if (max && isAfter(date, max)) return max;
      return date;
    },
    [min, max],
  );

  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(selected ?? clampToRange(defaultView ?? new Date())),
  );
  const [focusDate, setFocusDate] = useState<Date>(() => selected ?? clampToRange(defaultView ?? new Date()));
  const dayRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const keyboardActive = useRef(false);

  // Re-sync the view when the value changes from outside (e.g. form reset / load).
  useEffect(() => {
    if (selected) {
      setViewMonth(startOfMonth(selected));
      setFocusDate(selected);
    }
  }, [selected]);

  useEffect(() => {
    if (keyboardActive.current) {
      dayRefs.current.get(iso(focusDate))?.focus();
      keyboardActive.current = false;
    }
  }, [focusDate]);

  // Close the desktop panel on an outside click.
  useEffect(() => {
    if (!open || isMobile) return;
    const onDoc = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, isMobile]);

  const now = new Date();
  const fromYear = min ? min.getFullYear() : now.getFullYear() - 120;
  const toYear = max ? max.getFullYear() : now.getFullYear() + 20;
  const years = useMemo(
    () => Array.from({ length: Math.max(1, toYear - fromYear + 1) }, (_, i) => toYear - i),
    [fromYear, toYear],
  );

  const isDisabled = useCallback(
    (day: Date) => (min ? isBefore(day, min) : false) || (max ? isAfter(day, max) : false),
    [min, max],
  );

  const commit = useCallback(
    (day: Date) => {
      if (isDisabled(day)) return;
      onChange(iso(day));
      if (!isMobile) setOpen(false);
    },
    [isDisabled, onChange, isMobile],
  );

  const moveFocus = useCallback(
    (next: Date) => {
      const clamped = clampToRange(next);
      keyboardActive.current = true;
      setFocusDate(clamped);
      if (!isSameMonth(clamped, viewMonth)) setViewMonth(startOfMonth(clamped));
    },
    [clampToRange, viewMonth],
  );

  const onGridKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowLeft": event.preventDefault(); moveFocus(addDays(focusDate, -1)); break;
      case "ArrowRight": event.preventDefault(); moveFocus(addDays(focusDate, 1)); break;
      case "ArrowUp": event.preventDefault(); moveFocus(addDays(focusDate, -7)); break;
      case "ArrowDown": event.preventDefault(); moveFocus(addDays(focusDate, 7)); break;
      case "Home": event.preventDefault(); moveFocus(startOfWeek(focusDate, { weekStartsOn: WEEK_START })); break;
      case "End": event.preventDefault(); moveFocus(endOfWeek(focusDate, { weekStartsOn: WEEK_START })); break;
      case "PageUp": event.preventDefault(); moveFocus(event.shiftKey ? addYears(focusDate, -1) : addMonths(focusDate, -1)); break;
      case "PageDown": event.preventDefault(); moveFocus(event.shiftKey ? addYears(focusDate, 1) : addMonths(focusDate, 1)); break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(focusDate);
        break;
      case "Escape":
        if (!isMobile) { event.preventDefault(); setOpen(false); }
        break;
    }
  };

  const prevDisabled = min ? !isAfter(startOfMonth(viewMonth), startOfMonth(min)) : false;
  const nextDisabled = max ? !isBefore(endOfMonth(viewMonth), startOfMonth(max)) && isSameMonth(viewMonth, max) : false;

  const calendar = (
    <div className={isMobile ? "" : "mt-2 rounded-md border border-hairline bg-white p-4 shadow-card"}>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          disabled={prevDisabled}
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-soft disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <select
            aria-label="Month"
            value={viewMonth.getMonth()}
            onChange={(event) => setViewMonth(new Date(viewMonth.getFullYear(), Number(event.target.value), 1))}
            className="h-9 flex-1 rounded-sm border border-hairline bg-white px-2 text-sm font-semibold text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          >
            {MONTHS.map((label, index) => (
              <option key={label} value={index}>{label}</option>
            ))}
          </select>
          <select
            aria-label="Year"
            value={viewMonth.getFullYear()}
            onChange={(event) => setViewMonth(new Date(Number(event.target.value), viewMonth.getMonth(), 1))}
            className="h-9 w-24 rounded-sm border border-hairline bg-white px-2 text-sm font-semibold text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          disabled={nextDisabled}
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-soft disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-soft">
        {DAY_LABELS.map((label) => (
          <span key={label} className="py-1">{label}</span>
        ))}
      </div>
      <div
        role="grid"
        aria-label={ariaLabel}
        aria-describedby={gridId}
        onKeyDown={onGridKeyDown}
        className="grid grid-cols-7"
      >
        {buildMonthGrid(viewMonth).map((day) => {
          const outside = !isSameMonth(day, viewMonth);
          if (outside) return <span key={iso(day)} aria-hidden="true" className="h-10" />;
          const disabledDay = isDisabled(day);
          const isSelected = selected && isSameDay(day, selected);
          const isFocus = isSameDay(day, focusDate);
          const isToday = isSameDay(day, now);
          return (
            <button
              key={iso(day)}
              ref={(el) => {
                if (el) dayRefs.current.set(iso(day), el);
                else dayRefs.current.delete(iso(day));
              }}
              type="button"
              role="gridcell"
              tabIndex={isFocus ? 0 : -1}
              disabled={disabledDay}
              aria-disabled={disabledDay || undefined}
              aria-selected={Boolean(isSelected)}
              aria-label={format(day, "EEEE d MMMM yyyy")}
              onClick={() => commit(day)}
              onFocus={() => setFocusDate(day)}
              className={`relative flex h-10 items-center justify-center text-sm outline-none transition-colors
                ${disabledDay ? "cursor-not-allowed text-muted-soft line-through" : "text-ink hover:bg-surface-soft"}
                ${isSelected ? "rounded-full bg-accent font-semibold text-ink hover:bg-accent" : ""}
                ${!isSelected && isToday ? "font-semibold text-ink" : ""}
                focus-visible:ring-1 focus-visible:ring-ink`}
            >
              {format(day, "d")}
              {!isSelected && isToday && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            const target = clampToRange(startOfDay(now));
            setViewMonth(startOfMonth(target));
            if (!isDisabled(target)) commit(target);
          }}
          className="font-semibold text-primary hover:underline"
        >
          Today
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); if (!isMobile) setOpen(false); }}
            className="font-semibold text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <span id={gridId} className="sr-only">
        Use arrow keys to move by day, Page Up and Page Down to change month, Shift with Page Up or Down to change year, and Enter to select.
      </span>
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-12 w-full items-center justify-between gap-2 rounded-sm border bg-white px-4 text-left text-base outline-none transition-colors disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70
          ${error ? "border-error focus-visible:ring-1 focus-visible:ring-error" : open ? "border-ink" : "border-hairline hover:border-border-strong"}
          focus-visible:ring-1 focus-visible:ring-ink`}
      >
        <span className={selected ? "text-ink" : "text-muted-soft"}>
          {selected ? format(selected, "d MMMM yyyy") : placeholder}
        </span>
        <CalendarDays size={18} className="shrink-0 text-muted" />
      </button>

      {open && !isMobile && calendar}

      {open && isMobile && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-hairline-soft px-4 py-3">
            <h2 className="text-base font-semibold text-ink">{ariaLabel}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-surface-soft">
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{calendar}</div>
          <div className="border-t border-hairline-soft p-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-12 w-full rounded-sm bg-accent text-sm font-semibold text-ink transition hover:bg-accent-active hover:text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
