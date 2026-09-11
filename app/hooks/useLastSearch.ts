"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "redrive_last_search";
const UPDATE_EVENT = "redrive:last-search-updated";

export interface LastSearchFilters {
  state?: string;
  suburb?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  guestCount?: number;
  sleepCount?: number;
  minPrice?: number;
  maxPrice?: number;
  transmission?: string;
  delivery?: string;
  petsAllowed?: string;
  unsealed?: string;
}

export interface LastSearch {
  filters: LastSearchFilters;
  savedAt: string;
}

// useSyncExternalStore compares snapshots by reference, so the parsed object is
// memoised against the raw string it came from — otherwise every render would
// see a "new" value and loop.
let cachedRaw: string | null = null;
let cachedValue: LastSearch | null = null;

const readLastSearch = (): LastSearch | null => {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;

  try {
    if (!raw) {
      cachedValue = null;
    } else {
      const parsed = JSON.parse(raw) as Partial<LastSearch>;
      cachedValue =
        parsed.filters && typeof parsed.filters === "object" && typeof parsed.savedAt === "string"
          ? (parsed as LastSearch)
          : null;
    }
  } catch {
    cachedValue = null;
  }
  return cachedValue;
};

const getServerSnapshot = (): LastSearch | null => null;

const subscribe = (onChange: () => void) => {
  window.addEventListener(UPDATE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(UPDATE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

export const saveLastSearch = (filters: LastSearchFilters) => {
  if (typeof window === "undefined") return;

  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== "")
  ) as LastSearchFilters;

  const next: LastSearch = {
    filters: cleanFilters,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(UPDATE_EVENT));
};

const useLastSearch = () => {
  // Synchronous on the first client render so the "continue your search" card
  // reserves its space before paint rather than shifting content on hydration.
  return useSyncExternalStore(subscribe, readLastSearch, getServerSnapshot);
};

export default useLastSearch;
