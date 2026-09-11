"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "redrive_recently_viewed";
const MAX_ENTRIES = 8;
const UPDATE_EVENT = "redrive:recently-viewed-updated";

// A stable empty reference so the server snapshot (and the "nothing stored yet"
// client snapshot) never looks like a change to useSyncExternalStore.
const EMPTY: string[] = [];

// useSyncExternalStore calls getSnapshot on every render and bails out of a
// re-render only when the value is referentially equal. Parsing the JSON afresh
// each time would return a new array and loop forever, so the parse is memoised
// against the raw string it came from.
let cachedRaw: string | null = null;
let cachedIds: string[] = EMPTY;

const readIds = (): string[] => {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedIds;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : EMPTY;
    cachedIds = Array.isArray(parsed) && parsed.length ? parsed : EMPTY;
  } catch {
    cachedIds = EMPTY;
  }
  return cachedIds;
};

const getServerSnapshot = (): string[] => EMPTY;

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(UPDATE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(UPDATE_EVENT, onChange);
  };
};

const useRecentlyViewed = () => {
  // Reads localStorage on the first client render (not in an effect), so a
  // returning visitor's rails can reserve their space before paint instead of
  // popping in after hydration.
  const recentlyViewedIds = useSyncExternalStore(subscribe, readIds, getServerSnapshot);

  const addRecentlyViewed = useCallback((listingId: string) => {
    if (!listingId) return;
    const current = readIds();
    const next = [listingId, ...current.filter((id) => id !== listingId)].slice(0, MAX_ENTRIES);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private-mode / quota failures shouldn't break the page.
    }
    window.dispatchEvent(new Event(UPDATE_EVENT));
  }, []);

  return { recentlyViewedIds, addRecentlyViewed };
};

export default useRecentlyViewed;
