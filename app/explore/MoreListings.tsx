"use client";

import { useCallback, useState } from "react";
import qs from "query-string";
import ListingCard from "../components/listings/ListingCard";
import type { ListingCardData } from "../libs/listingCardData";
import type { IListingsParams } from "../actions/getListings";
import type { SafeUser } from "../types";

interface MoreListingsProps {
  /** The active /explore filters, forwarded to /api/listings. */
  params: IListingsParams;
  /** Cursor for the next page, or null when the first page was the last. */
  initialCursor: string | null;
  currentUser?: SafeUser | null;
  tripDays: number | null;
}

const GRID =
  "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-8";

// Appends further pages of results below the server-rendered first page. The
// server only ever renders one bounded page; this fetches the rest on demand.
export default function MoreListings({
  params,
  initialCursor,
  currentUser,
  tripDays,
}: MoreListingsProps) {
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(false);
    try {
      const url = qs.stringifyUrl(
        { url: "/api/listings", query: { ...(params as Record<string, unknown>), cursor } },
        { skipNull: true, skipEmptyString: true },
      );
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        listings: ListingCardData[];
        nextCursor: string | null;
      };
      setItems((prev) => [...prev, ...data.listings]);
      setCursor(data.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, params]);

  return (
    <>
      {items.length > 0 && (
        <div className={`${GRID} mt-7 sm:mt-8`}>
          {items.map((data) => (
            <ListingCard
              key={data.id}
              data={data}
              currentUser={currentUser}
              tripDays={tripDays}
            />
          ))}
        </div>
      )}

      {cursor && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-sm border border-ink bg-white px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-soft disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load more vehicles"}
          </button>
          {error && (
            <p className="mt-2 text-sm text-error">Couldn&rsquo;t load more results. Try again.</p>
          )}
        </div>
      )}
    </>
  );
}
