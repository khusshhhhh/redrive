"use client";

import { useCallback, useState } from "react";
import axios from "axios";
import { toast } from "@/app/libs/toast";
import type { SafeReservation } from "@/app/types";

/**
 * Client-side "load older" pagination for the trips / reservations lists. The
 * server renders the first page; this appends further pages from
 * GET /api/reservations without a full navigation.
 */
export function useLoadMoreReservations(
  initial: SafeReservation[],
  initialCursor: string | null,
  role: "guest" | "host",
) {
  const [items, setItems] = useState<SafeReservation[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const { data } = await axios.get<{
        reservations: SafeReservation[];
        nextCursor: string | null;
      }>("/api/reservations", { params: { role, cursor } });
      setItems((prev) => [...prev, ...data.reservations]);
      setCursor(data.nextCursor);
    } catch {
      toast.error("Couldn't load more reservations. Try again.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, role]);

  return { items, hasMore: cursor !== null, loading, loadMore };
}
