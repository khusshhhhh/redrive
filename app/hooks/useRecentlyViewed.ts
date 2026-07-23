"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "redrive_recently_viewed";
const MAX_ENTRIES = 8;

const readIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const useRecentlyViewed = () => {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readIds());
  }, []);

  const addRecentlyViewed = useCallback((listingId: string) => {
    if (!listingId) return;
    const current = readIds();
    const next = [listingId, ...current.filter((id) => id !== listingId)].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setIds(next);
  }, []);

  return { recentlyViewedIds: ids, addRecentlyViewed };
};

export default useRecentlyViewed;
