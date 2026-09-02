"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
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
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DateRangeValue {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  /** Render the calendar directly with no trigger button or popover. */
  inline?: boolean;
  /** Show the quick-range presets. */
  presets?: boolean;
  label?: string;
  triggerClassName?: string;
  className?: string;
}

const WEEK_START = 1; // Monday
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const iso = (d: Date) => format(d, "yyyy-MM-dd");

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

function presetRanges(from: Date): { label: string; range: DateRangeValue }[] {
  const base = startOfDay(from);
  const dow = base.getDay(); // 0 Sun … 6 Sat
  const daysToSat = (6 - dow + 7) % 7;
  const thisSat = addDays(base, daysToSat === 0 && dow === 6 ? 0 : daysToSat);
  return [
    { label: "This weekend", range: { startDate: thisSat, endDate: addDays(thisSat, 1) } },
    { label: "Next weekend", range: { startDate: addDays(thisSat, 7), endDate: addDays(thisSat, 8) } },
    { label: "3 days", range: { startDate: base, endDate: addDays(base, 2) } },
    { label: "One week", range: { startDate: base, endDate: addDays(base, 6) } },
    { label: "Two weeks", range: { startDate: base, endDate: addDays(base, 13) } },
    { label: "One month", range: { startDate: base, endDate: addDays(base, 29) } },
  ];
}

export default function DateRangePicker(props: DateRangePickerProps) {
  const { value, inline, label = "Dates", triggerClassName = "", className = "" } = props;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open || inline || isMobile) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, inline, isMobile]);

  if (inline) {
    return <DateRangeCalendar {...props} className={className} />;
  }

  const triggerText =
    value.startDate && value.endDate
      ? `${format(value.startDate, "d MMM")} – ${format(value.endDate, "d MMM")}`
      : value.startDate
      ? `${format(value.startDate, "d MMM")} – …`
      : "Add dates";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-12 w-full items-center justify-between gap-2 rounded-sm border bg-white px-4 text-left text-base outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ink ${
          open ? "border-ink" : "border-hairline hover:border-border-strong"
        } ${triggerClassName}`}
      >
        <span className={value.startDate ? "text-ink" : "text-muted-soft"}>{triggerText}</span>
      </button>

      {open && isMobile && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-hairline-soft px-4 py-3">
            <h2 className="text-base font-semibold text-ink">{label}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-surface-soft">
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <DateRangeCalendar {...props} mobileSheet />
          </div>
          <div className="border-t border-hairline-soft p-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-12 w-full rounded-sm bg-primary text-sm font-semibold text-white transition hover:bg-primary-active"
            >
              {value.startDate && value.endDate
                ? `Confirm · ${differenceInCalendarDays(value.endDate, value.startDate) + 1} days`
                : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {open && !isMobile && (
        <div
          role="dialog"
          aria-label={label}
          className="dropdown-menu absolute right-0 top-full z-40 mt-2 origin-top rounded-md border border-hairline bg-white p-4 shadow-card"
        >
          <DateRangeCalendar {...props} />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-sm bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-active"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── The calendar itself ─────────────────────────────────────────────────── */

function DateRangeCalendar({
  value,
  onChange,
  minDate,
  maxDate,
  disabledDates = [],
  presets = true,
  mobileSheet = false,
  className = "",
}: DateRangePickerProps & { mobileSheet?: boolean }) {
  const gridId = useId();
  const min = useMemo(() => startOfDay(minDate ?? new Date()), [minDate]);
  const disabledSet = useMemo(() => new Set(disabledDates.map(iso)), [disabledDates]);

  const monthCount = mobileSheet ? 5 : 2;
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(value.startDate ?? min));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [focusDate, setFocusDate] = useState<Date>(value.startDate ?? min);
  const dayRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const keyboardActive = useRef(false);

  useEffect(() => {
    if (keyboardActive.current) {
      dayRefs.current.get(iso(focusDate))?.focus();
      keyboardActive.current = false;
    }
  }, [focusDate]);

  const months = useMemo(
    () => Array.from({ length: monthCount }, (_, i) => addMonths(viewMonth, i)),
    [viewMonth, monthCount],
  );

  const isDisabled = useCallback(
    (day: Date) =>
      isBefore(day, min) || (maxDate ? isAfter(day, startOfDay(maxDate)) : false) || disabledSet.has(iso(day)),
    [min, maxDate, disabledSet],
  );

  const rangeHasDisabled = useCallback(
    (a: Date, b: Date) => {
      const [lo, hi] = isBefore(a, b) ? [a, b] : [b, a];
      for (let d = lo; !isAfter(d, hi); d = addDays(d, 1)) if (disabledSet.has(iso(d))) return true;
      return false;
    },
    [disabledSet],
  );

  const selectDay = useCallback(
    (day: Date) => {
      if (isDisabled(day)) return;
      const { startDate, endDate } = value;
      if (!startDate || (startDate && endDate)) {
        onChange({ startDate: day, endDate: null });
        return;
      }
      if (isBefore(day, startDate)) {
        onChange({ startDate: day, endDate: null });
        return;
      }
      if (rangeHasDisabled(startDate, day)) {
        onChange({ startDate: day, endDate: null });
        return;
      }
      onChange({ startDate, endDate: day });
    },
    [value, onChange, isDisabled, rangeHasDisabled],
  );

  const ensureVisible = useCallback(
    (day: Date) => {
      const first = months[0];
      const last = months[months.length - 1];
      if (isBefore(day, startOfMonth(first))) setViewMonth(startOfMonth(day));
      else if (isAfter(day, endOfMonth(last))) setViewMonth(startOfMonth(addMonths(day, -(monthCount - 1))));
    },
    [months, monthCount],
  );

  const moveFocus = useCallback(
    (next: Date) => {
      if (isBefore(next, min)) next = min;
      keyboardActive.current = true;
      setFocusDate(next);
      ensureVisible(next);
    },
    [min, ensureVisible],
  );

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft": e.preventDefault(); moveFocus(addDays(focusDate, -1)); break;
      case "ArrowRight": e.preventDefault(); moveFocus(addDays(focusDate, 1)); break;
      case "ArrowUp": e.preventDefault(); moveFocus(addDays(focusDate, -7)); break;
      case "ArrowDown": e.preventDefault(); moveFocus(addDays(focusDate, 7)); break;
      case "Home": e.preventDefault(); moveFocus(startOfWeek(focusDate, { weekStartsOn: WEEK_START })); break;
      case "End": e.preventDefault(); moveFocus(endOfWeek(focusDate, { weekStartsOn: WEEK_START })); break;
      case "PageUp": e.preventDefault(); moveFocus(e.shiftKey ? addYears(focusDate, -1) : addMonths(focusDate, -1)); break;
      case "PageDown": e.preventDefault(); moveFocus(e.shiftKey ? addYears(focusDate, 1) : addMonths(focusDate, 1)); break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectDay(focusDate);
        setHoverDate(focusDate);
        break;
    }
  };

  const previewEnd = value.startDate && !value.endDate ? hoverDate : null;

  const inRange = (day: Date) => {
    const s = value.startDate;
    const e = value.endDate ?? previewEnd;
    if (!s || !e) return false;
    const [lo, hi] = isBefore(s, e) ? [s, e] : [e, s];
    return !isBefore(day, lo) && !isAfter(day, hi);
  };

  return (
    <div className={`flex flex-col gap-4 sm:flex-row ${className}`}>
      {presets && (
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 sm:w-40 sm:flex-col sm:overflow-visible sm:border-r sm:border-hairline-soft sm:pr-4">
          {presetRanges(min).map((preset) => {
            const active =
              value.startDate &&
              value.endDate &&
              isSameDay(value.startDate, preset.range.startDate!) &&
              isSameDay(value.endDate, preset.range.endDate!);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onChange(preset.range);
                  setViewMonth(startOfMonth(preset.range.startDate!));
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition-colors sm:rounded-sm ${
                  active ? "border-ink bg-ink text-white" : "border-hairline text-ink hover:border-border-strong"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between gap-2">
          <TypedDateInput
            label="Start"
            date={value.startDate}
            min={min}
            onCommit={(d) => { onChange({ startDate: d, endDate: null }); setViewMonth(startOfMonth(d)); }}
          />
          <span className="text-muted-soft">–</span>
          <TypedDateInput
            label="End"
            date={value.endDate}
            min={value.startDate ?? min}
            onCommit={(d) => value.startDate && selectDay(d)}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setViewMonth(addMonths(viewMonth, -1))}
            disabled={!isAfter(startOfMonth(viewMonth), startOfMonth(min))}
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-soft disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-soft"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          role="grid"
          aria-label="Choose a date range"
          aria-describedby={gridId}
          onKeyDown={onGridKeyDown}
          onMouseLeave={() => setHoverDate(null)}
          className={`grid gap-x-6 gap-y-6 ${monthCount >= 3 ? "sm:grid-cols-1" : mobileSheet ? "grid-cols-1" : "sm:grid-cols-2"}`}
        >
          {months.map((month) => (
            <div key={iso(month)}>
              <p className="mb-2 text-center text-sm font-semibold text-ink">{format(month, "MMMM yyyy")}</p>
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-soft">
                {DAY_LABELS.map((d) => (
                  <span key={d} className="py-1">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {buildMonthGrid(month).map((day) => {
                  const outside = !isSameMonth(day, month);
                  const disabled = isDisabled(day);
                  const isStart = value.startDate && isSameDay(day, value.startDate);
                  const isEnd = value.endDate && isSameDay(day, value.endDate);
                  const within = inRange(day) && !isStart && !isEnd;
                  const isFocus = isSameDay(day, focusDate);

                  if (outside) return <span key={iso(day)} aria-hidden="true" className="h-10" />;

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
                      disabled={disabled}
                      aria-disabled={disabled || undefined}
                      aria-selected={Boolean(isStart || isEnd)}
                      aria-label={format(day, "EEEE d MMMM yyyy")}
                      onClick={() => { selectDay(day); setHoverDate(day); }}
                      onMouseEnter={() => setHoverDate(day)}
                      onFocus={() => setFocusDate(day)}
                      className={`relative flex h-10 items-center justify-center text-sm outline-none transition-colors
                        ${disabled ? "cursor-not-allowed text-muted-soft line-through" : "text-ink hover:bg-surface-soft"}
                        ${within ? "bg-surface-strong/70" : ""}
                        ${isStart || isEnd ? "rounded-full bg-ink font-semibold text-white hover:bg-ink" : ""}
                        ${isStart && value.endDate ? "rounded-l-full" : ""}
                        ${isEnd ? "rounded-r-full" : ""}
                        focus-visible:ring-1 focus-visible:ring-ink`}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>
            {value.startDate && value.endDate
              ? `${differenceInCalendarDays(value.endDate, value.startDate) + 1} days selected`
              : value.startDate
              ? "Pick an end date"
              : "Pick a start date"}
          </span>
          {(value.startDate || value.endDate) && (
            <button
              type="button"
              onClick={() => onChange({ startDate: null, endDate: null })}
              className="font-semibold text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <span id={gridId} className="sr-only">Use arrow keys to move by day, Page Up and Page Down to change month, Shift with Page Up or Down to change year, and Enter to select.</span>
    </div>
  );
}

function TypedDateInput({
  label,
  date,
  min,
  onCommit,
}: {
  label: string;
  date: Date | null;
  min: Date;
  onCommit: (d: Date) => void;
}) {
  const [text, setText] = useState(date ? format(date, "d MMM yyyy") : "");
  useEffect(() => setText(date ? format(date, "d MMM yyyy") : ""), [date]);

  const commit = () => {
    if (!text.trim()) return;
    for (const fmt of ["d MMM yyyy", "d/M/yyyy", "d-M-yyyy", "yyyy-MM-dd", "d MMMM yyyy"]) {
      const parsed = parse(text.trim(), fmt, new Date());
      if (isValid(parsed) && !isBefore(startOfDay(parsed), min)) {
        onCommit(startOfDay(parsed));
        return;
      }
    }
    setText(date ? format(date, "d MMM yyyy") : "");
  };

  return (
    <label className="flex-1">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-soft">{label}</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
        }}
        placeholder="e.g. 12 Sep 2026"
        className="h-10 w-full rounded-sm border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
      />
    </label>
  );
}
