"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  /** Show a filter box once the list is at least this long. */
  searchThreshold?: number;
  className?: string;
  id?: string;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label,
  disabled = false,
  searchThreshold = 10,
  className = "",
  id,
}: DropdownProps) {
  const autoId = useId();
  const rootId = id ?? autoId;
  const listId = `${rootId}-list`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const [open, setOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = options.find((o) => o.value === value) ?? null;
  const showSearch = options.length >= searchThreshold;

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Decide whether to open upward: flip when the menu would overflow the viewport
  // bottom but there's more room above.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const estimate = Math.min(320, filtered.length * 40 + (showSearch ? 52 : 0) + 16);
    setFlipUp(below < estimate && rect.top > below);
  }, [open, filtered.length, showSearch]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const currentIndex = filtered.findIndex((o) => o.value === value);
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
      if (showSearch) requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  const commit = (option: DropdownOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(filtered.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[activeIndex]) commit(filtered[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative w-full ${className}`} onKeyDown={onKeyDown}>
      {label && <label className="mb-1.5 block text-xs font-medium text-muted">{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        id={rootId}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex h-12 w-full items-center justify-between gap-2 rounded-sm border bg-white px-4 text-left text-base outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ink disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70 ${
          open ? "border-ink" : "border-hairline hover:border-border-strong"
        }`}
      >
        <span className={selected ? "truncate text-ink" : "truncate text-muted-soft"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          className={`dropdown-menu absolute z-30 w-full overflow-hidden rounded-sm border border-hairline bg-white shadow-card ${
            flipUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top"
          }`}
        >
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-hairline-soft px-3">
              <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search…"
                className="h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-soft"
                aria-label="Filter options"
              />
            </div>
          )}

          <ul id={listId} role="listbox" aria-labelledby={rootId} className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-4 py-3 text-sm text-muted">No matches</li>}
            {filtered.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li
                  key={option.value}
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(option)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                    option.disabled ? "cursor-not-allowed text-muted-soft" : isActive ? "bg-surface-soft text-ink" : "text-ink"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check size={15} className="shrink-0 text-ink" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
