"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Heading from "./Heading";
import ListingCard from "./listings/ListingCard";
import useRecentlyViewed from "../hooks/useRecentlyViewed";
import { SafeListing, SafeUser } from "../types";

interface RecentlyViewedProps {
  currentUser?: SafeUser | null;
}

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ currentUser }) => {
  const { recentlyViewedIds } = useRecentlyViewed();
  const [listings, setListings] = useState<SafeListing[]>([]);

  useEffect(() => {
    if (recentlyViewedIds.length === 0) {
      setListings([]);
      return;
    }

    let cancelled = false;

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
    });

    return () => {
      cancelled = true;
    };
  }, [recentlyViewedIds]);

  if (listings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white mt-12">
      <Heading title="Recently Viewed" subtitle="Pick up where you left off" />
      <div className="mt-4 flex flex-row gap-6 overflow-x-auto scrollbar-hide pb-2">
        {listings.map((listing) => (
          <div key={listing.id} className="w-[220px] shrink-0">
            <ListingCard currentUser={currentUser} data={listing} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentlyViewed;
