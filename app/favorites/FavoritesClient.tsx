"use client";

import {
  IconArrowRight,
  IconArrowsExchange,
  IconHeartFilled,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import Container from "../components/Container";
import Illustration from "../components/Illustration";
import ListingCard from "../components/listings/ListingCard";
import useLoginModal from "../hooks/useLoginModal";
import type { ListingCardData } from "../libs/listingCardData";
import type { SafeUser } from "../types";

interface FavoritesClientProps {
  listings: ListingCardData[];
  currentUser?: SafeUser | null;
}

type SortOption = "saved" | "price-low" | "price-high" | "name";

// Matches the column ladder below, so each card fetches an image sized for the
// width it actually renders at rather than the denser browse grid's width.
const FAVOURITE_CARD_SIZES =
  "(max-width: 639px) 100vw, (max-width: 767px) 50vw, (max-width: 1279px) 33vw, (max-width: 1535px) 25vw, 20vw";

export default function FavoritesClient({ listings, currentUser }: FavoritesClientProps) {
  const loginModal = useLoginModal();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortOption>("saved");

  const categories = useMemo(
    () => Array.from(new Set(listings.map((listing) => listing.category))).sort((a, b) => a.localeCompare(b)),
    [listings],
  );

  const visibleListings = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en-AU");
    const filteredListings = listings.filter((listing) => {
      const matchesCategory = category === "All" || listing.category === category;
      const matchesQuery = !normalizedQuery || [listing.title, listing.category, listing.suburb, listing.state]
        .some((value) => value.toLocaleLowerCase("en-AU").includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });

    if (sort === "price-low") return [...filteredListings].sort((a, b) => a.price - b.price);
    if (sort === "price-high") return [...filteredListings].sort((a, b) => b.price - a.price);
    if (sort === "name") return [...filteredListings].sort((a, b) => a.title.localeCompare(b.title));
    return filteredListings;
  }, [category, listings, query, sort]);

  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setSort("saved");
  };

  const filtered = Boolean(query.trim()) || category !== "All";

  return (
    <main className="min-h-[70vh] pb-16 sm:pb-20">
      <Container>
        <section className="relative mt-5 overflow-hidden rounded-xl border border-hairline bg-surface-soft px-5 py-7 sm:mt-8 sm:px-8 sm:py-10 lg:px-12" aria-labelledby="favourites-heading">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-secondary-soft/80" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 right-1/4 h-48 w-48 rounded-full bg-accent-soft/70" aria-hidden="true" />
          <div className="relative grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-white/90 px-3 py-1.5 text-micro-label font-semibold uppercase tracking-[0.12em] text-primary">
                <IconHeartFilled size={14} aria-hidden="true" /> Your saved collection
              </div>
              <h1 id="favourites-heading" className="mt-5 text-[32px] font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-[44px]">
                Vehicles worth coming back to.
              </h1>
              <p className="mt-4 max-w-2xl text-body-sm leading-6 text-body sm:text-body-md sm:leading-7">
                Keep your road-trip ideas together, compare the details that matter, and return when you are ready to choose.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-stretch" aria-label="Favourite collection summary">
              <div className="min-w-32 rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                <div className="text-display-lg font-semibold text-ink">{listings.length}</div>
                <div className="mt-1 text-caption-sm text-muted">saved vehicle{listings.length === 1 ? "" : "s"}</div>
              </div>
              <div className="min-w-32 rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                <div className="text-display-lg font-semibold text-ink">{categories.length}</div>
                <div className="mt-1 text-caption-sm text-muted">vehicle type{categories.length === 1 ? "" : "s"}</div>
              </div>
            </div>
          </div>
        </section>

        {!currentUser ? (
          <section className="mx-auto flex min-h-[380px] max-w-xl flex-col items-center justify-center py-14 text-center" aria-labelledby="signed-out-favourites">
            <Illustration name="signed-out" width={220} className="mb-6 h-auto w-[180px] sm:w-[220px]" />
            <h2 id="signed-out-favourites" className="mt-2 text-display-lg font-semibold text-ink">Sign in to see your favourites</h2>
            <p className="mt-3 max-w-md text-body-sm leading-6 text-muted">Your saved vehicles are kept with your Redrive account so they are available across your devices.</p>
            <button type="button" onClick={() => loginModal.onOpen()} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-button-sm font-semibold text-ink transition hover:bg-accent-active hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Sign in <IconArrowRight size={17} aria-hidden="true" />
            </button>
          </section>
        ) : listings.length === 0 ? (
          <section className="mx-auto flex min-h-[420px] max-w-2xl flex-col items-center justify-center py-14 text-center" aria-labelledby="empty-favourites">
            <Illustration name="saved-empty" width={260} className="mb-6 h-auto w-[220px] sm:w-[260px]" />
            <h2 id="empty-favourites" className="mt-2 text-display-lg font-semibold text-ink">Start your vehicle shortlist</h2>
            <p className="mt-3 max-w-lg text-body-sm leading-6 text-muted sm:text-body-md">Tap the heart on any listing and it will appear here, ready for your next trip plan.</p>
            <Link href="/explore" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-button-sm font-semibold text-ink transition hover:bg-accent-active hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Explore vehicles <IconArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <section className="pt-9 sm:pt-12" aria-labelledby="saved-vehicles-heading">
            <div className="flex flex-col gap-5 border-b border-hairline pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-caption-sm font-semibold text-secondary">
                  <IconArrowsExchange size={17} aria-hidden="true" /> Shortlist and compare
                </div>
                <h2 id="saved-vehicles-heading" className="mt-2 text-display-lg font-semibold text-ink">Your saved vehicles</h2>
                <p className="mt-1 text-body-sm text-muted">Select Compare on up to three cards to view them side by side.</p>
              </div>
              <Link href="/explore" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-border-strong bg-white px-5 text-button-sm font-semibold text-ink transition hover:border-primary hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Find more vehicles <IconArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-6 rounded-lg border border-hairline bg-white p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="relative block flex-1 lg:max-w-md">
                  <span className="sr-only">Search saved vehicles</span>
                  <IconSearch size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, type or location" className="h-11 w-full rounded-md border border-hairline bg-surface-soft pl-10 pr-10 text-body-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15" />
                  {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><IconX size={16} /></button> : null}
                </label>
                <label className="flex items-center justify-between gap-3 rounded-md border border-hairline px-3 lg:min-w-52">
                  <span className="text-caption-sm font-medium text-muted">Sort by</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} className="h-11 min-w-32 bg-transparent text-right text-body-sm font-semibold text-ink outline-none">
                    <option value="saved">Recently saved</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="name">Vehicle name</option>
                  </select>
                </label>
              </div>

              {categories.length > 1 ? <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filter favourites by vehicle type">
                {["All", ...categories].map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`min-h-9 shrink-0 rounded-full border px-4 text-caption-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${category === item ? "border-primary bg-primary text-white" : "border-hairline bg-white text-body hover:border-border-strong hover:bg-surface-soft"}`}>
                    {item}
                  </button>
                ))}
              </div> : null}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-caption-sm text-muted" aria-live="polite">Showing <span className="font-semibold text-ink">{visibleListings.length}</span> of {listings.length}</p>
              {filtered ? <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 text-caption-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><IconX size={15} /> Clear filters</button> : null}
            </div>

            {visibleListings.length ? (
              <ul
                role="list"
                className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 xl:grid-cols-4 xl:gap-6 2xl:grid-cols-5"
              >
                {visibleListings.map((listing, index) => (
                  <li
                    key={listing.id}
                    // Cells stretch to the tallest card in their row, so the
                    // borders line up even when one vehicle carries an extra
                    // line of detail.
                    className="favourite-cell rounded-lg border border-hairline-soft bg-white p-3 transition duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-card focus-within:border-border-strong focus-within:shadow-card"
                    // The stagger is capped so a long shortlist still finishes
                    // arriving promptly instead of trickling in for seconds.
                    style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
                  >
                    <ListingCard
                      currentUser={currentUser}
                      data={listing}
                      priority={index < 4}
                      sizes={FAVOURITE_CARD_SIZES}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-soft px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary"><IconSearch size={22} /></div>
                <h3 className="mt-4 text-title-md font-semibold text-ink">No saved vehicles match</h3>
                <p className="mt-2 text-body-sm text-muted">Try another search or clear the vehicle-type filter.</p>
                <button type="button" onClick={clearFilters} className="mt-5 min-h-10 rounded-full border border-primary px-4 text-button-sm font-semibold text-primary transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Show all favourites</button>
              </div>
            )}
          </section>
        )}
      </Container>
    </main>
  );
}
