"use client";

import { useEffect, useState } from "react";

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

const readLastSearch = (): LastSearch | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<LastSearch>;
    if (!parsed.filters || typeof parsed.filters !== "object" || typeof parsed.savedAt !== "string") {
      return null;
    }

    return parsed as LastSearch;
  } catch {
    return null;
  }
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
  const [lastSearch, setLastSearch] = useState<LastSearch | null>(null);

  useEffect(() => {
    const update = () => setLastSearch(readLastSearch());
    update();

    window.addEventListener(UPDATE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(UPDATE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return lastSearch;
};

export default useLastSearch;
