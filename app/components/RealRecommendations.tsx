"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { IconEyeOff, IconSparkles } from "@tabler/icons-react";

import useLastSearch from "../hooks/useLastSearch";
import useRecentlyViewed from "../hooks/useRecentlyViewed";
import type { SafeListing, SafeUser } from "../types";
import Heading from "./Heading";
import ListingCard from "./listings/ListingCard";

type RecommendedListing = SafeListing & { recommendationReason: string };
const HIDDEN_KEY = "redrive_hidden_recommendations";

const RealRecommendations = ({ currentUser }: { currentUser?: SafeUser | null }) => {
  const lastSearch = useLastSearch();
  const { recentlyViewedIds } = useRecentlyViewed();
  const [listings, setListings] = useState<RecommendedListing[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    try { setHidden(JSON.parse(window.localStorage.getItem(HIDDEN_KEY) || "[]")); } catch { setHidden([]); }
  }, []);

  const requestKey = useMemo(() => JSON.stringify({ viewed: recentlyViewedIds, filters: lastSearch?.filters }), [recentlyViewedIds, lastSearch]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (recentlyViewedIds.length) params.set("viewed", recentlyViewedIds.join(","));
    for (const key of ["state", "suburb", "startDate", "endDate"] as const) {
      const value = lastSearch?.filters[key];
      if (value) params.set(key, String(value));
    }
    axios.get(`/api/recommendations?${params.toString()}`)
      .then((response) => setListings(response.data || []))
      .catch(() => setListings([]));
  // requestKey captures the full meaningful input while avoiding object-identity refetches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const visible = listings.filter((listing) => !hidden.includes(listing.id));
  if (visible.length === 0) return null;

  const hide = (id: string) => {
    const next = [...new Set([...hidden, id])].slice(-30);
    setHidden(next);
    window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
  };

  return (
    <section className="mt-12" aria-labelledby="recommendations-heading">
      <div id="recommendations-heading" className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-active"><IconSparkles size={19} /></span>
        <Heading title="Recommended for you" subtitle="Real vehicles ranked from your location, dates and activity" />
      </div>
      <div className="mt-4 flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
        {visible.map((listing) => (
          <article key={listing.id} className="w-[240px] shrink-0 sm:w-[260px]">
            <div className="mb-2 flex min-h-9 items-start justify-between gap-2 rounded-sm bg-surface-soft px-2.5 py-2 text-[11px] leading-4 text-muted">
              <span><IconSparkles size={13} className="mr-1 inline text-primary" />{listing.recommendationReason}</span>
              <button type="button" onClick={() => hide(listing.id)} aria-label={`Show fewer recommendations like ${listing.title}`} className="shrink-0 rounded-full p-1 hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><IconEyeOff size={14} /></button>
            </div>
            <ListingCard currentUser={currentUser} data={listing} />
          </article>
        ))}
      </div>
    </section>
  );
};

export default RealRecommendations;
