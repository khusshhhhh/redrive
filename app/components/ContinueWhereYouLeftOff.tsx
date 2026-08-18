"use client";

import axios from "axios";
import { format, isValid, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import qs from "query-string";
import { useEffect, useMemo, useState } from "react";
import { IconArrowRight, IconCalendar, IconMapPin, IconSearch } from "@tabler/icons-react";

import useLastSearch from "../hooks/useLastSearch";
import useRecentlyViewed from "../hooks/useRecentlyViewed";
import { SafeListing, SafeUser } from "../types";
import Heading from "./Heading";
import ListingCard from "./listings/ListingCard";

interface ContinueWhereYouLeftOffProps {
  currentUser: SafeUser;
}

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMM") : null;
};

const ContinueWhereYouLeftOff: React.FC<ContinueWhereYouLeftOffProps> = ({ currentUser }) => {
  const router = useRouter();
  const lastSearch = useLastSearch();
  const { recentlyViewedIds } = useRecentlyViewed();
  const [listings, setListings] = useState<SafeListing[]>([]);

  useEffect(() => {
    const ids = recentlyViewedIds.slice(0, 4);
    if (ids.length === 0) {
      setListings([]);
      return;
    }

    let cancelled = false;
    Promise.all(
      ids.map((id) => axios.get(`/api/listings/${id}`).then((response) => response.data).catch(() => null))
    ).then((results) => {
      if (cancelled) return;
      const found = results.filter(Boolean) as SafeListing[];
      setListings(ids.map((id) => found.find((listing) => listing.id === id)).filter(Boolean) as SafeListing[]);
    });

    return () => {
      cancelled = true;
    };
  }, [recentlyViewedIds]);

  const searchSummary = useMemo(() => {
    if (!lastSearch) return null;
    const { filters } = lastSearch;
    const location = filters.suburb
      ? `${filters.suburb}${filters.state ? `, ${filters.state}` : ""}`
      : filters.state || "Anywhere in Australia";
    const start = formatDate(filters.startDate);
    const end = formatDate(filters.endDate);
    const dates = start && end ? `${start} – ${end}` : "Flexible dates";
    const people = filters.guestCount ? `${filters.guestCount} ${filters.guestCount === 1 ? "person" : "people"}` : null;

    return { location, dates, people };
  }, [lastSearch]);

  if (!lastSearch && listings.length === 0) return null;

  const repeatSearch = () => {
    if (!lastSearch) return;
    router.push(qs.stringifyUrl({ url: "/", query: { ...lastSearch.filters } }, { skipNull: true, skipEmptyString: true }));
  };

  return (
    <section className="mt-12" aria-labelledby="continue-journey-heading">
      <div id="continue-journey-heading">
        <Heading title="Continue your journey" subtitle="Return to your latest search or a vehicle you viewed" />
      </div>

      <div className={`mt-4 grid gap-5 ${lastSearch ? "lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,2fr)]" : ""}`}>
        {lastSearch && searchSummary && (
          <button
            type="button"
            onClick={repeatSearch}
            className="group flex min-h-[176px] w-full flex-col justify-between rounded-md border border-hairline bg-surface-soft p-5 text-left outline-none transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-6"
            aria-label={`Continue search in ${searchSummary.location}, ${searchSummary.dates}`}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
                <IconSearch size={21} aria-hidden="true" />
              </span>
              <IconArrowRight size={20} className="text-primary transition group-hover:translate-x-1" aria-hidden="true" />
            </span>
            <span className="mt-6 block">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-primary">Continue your search</span>
              <span className="mt-2 flex items-center gap-2 text-base font-semibold text-ink">
                <IconMapPin size={17} className="shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{searchSummary.location}</span>
              </span>
              <span className="mt-1.5 flex items-center gap-2 text-sm text-muted">
                <IconCalendar size={17} className="shrink-0" aria-hidden="true" />
                <span>{searchSummary.dates}{searchSummary.people ? ` · ${searchSummary.people}` : ""}</span>
              </span>
            </span>
          </button>
        )}

        {listings.length > 0 && (
          <div className="min-w-0">
            <p className="mb-3 text-sm font-semibold text-ink">Recently viewed</p>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:gap-5">
              {listings.map((listing) => (
                <div key={listing.id} className="w-[220px] shrink-0 sm:w-[240px]">
                  <ListingCard currentUser={currentUser} data={listing} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ContinueWhereYouLeftOff;
