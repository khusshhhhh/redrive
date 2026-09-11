"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Heading from "./Heading";
import ListingCard from "./listings/ListingCard";
import HorizontalScroller from "./HorizontalScroller";
import RailSkeleton from "./RailSkeleton";
import useRecentlyViewed from "../hooks/useRecentlyViewed";
import { SafeListing, SafeUser } from "../types";

interface RecentlyViewedProps {
  currentUser?: SafeUser | null;
}

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ currentUser }) => {
  const { recentlyViewedIds } = useRecentlyViewed();
  const [listings, setListings] = useState<SafeListing[]>([]);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (recentlyViewedIds.length === 0) {
      setListings([]);
      setResolved(true);
      return;
    }

    let cancelled = false;
    setResolved(false);

    Promise.all(
      recentlyViewedIds.map((id) =>
        axios.get(`/api/listings/${id}`).then((res) => res.data).catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      const found = results.filter(Boolean) as SafeListing[];
      // Preserve most-recently-viewed-first order.
      const ordered = recentlyViewedIds
        .map((id) => found.find((listing) => listing.id === id))
        .filter(Boolean) as SafeListing[];
      setListings(ordered);
      setResolved(true);
    });

    return () => {
      cancelled = true;
    };
  }, [recentlyViewedIds]);

  // No history → nothing to show and nothing to reserve. When there is history,
  // hold the rail's height with a skeleton until the lookups resolve so the
  // catalogue below doesn't jump.
  if (recentlyViewedIds.length === 0) {
    return null;
  }
  if (!resolved && listings.length === 0) {
    return (
      <RailSkeleton
        count={Math.min(recentlyViewedIds.length, 5)}
        cardWidth={220}
        label="Loading recently viewed vehicles"
      />
    );
  }
  if (listings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white mt-12">
      <Heading title="Recently Viewed" subtitle="Pick up where you left off" />
      <HorizontalScroller
        ariaLabel="Recently viewed vehicles"
        className="mt-4 gap-6 pb-2"
      >
        {listings.map((listing) => (
          <div key={listing.id} className="w-[calc((100vw-3.25rem)/2)] min-w-[148px] max-w-[220px] shrink-0 snap-start sm:w-[220px]">
            <ListingCard currentUser={currentUser} data={listing} />
          </div>
        ))}
      </HorizontalScroller>
    </div>
  );
};

export default RecentlyViewed;
