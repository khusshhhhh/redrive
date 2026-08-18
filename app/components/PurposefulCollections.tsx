import { format } from "date-fns";
import { IconBriefcase, IconCalendarEvent, IconMapPinStar } from "@tabler/icons-react";
import type { SafeListing, SafeUser } from "../types";
import ListingCard from "./listings/ListingCard";

interface PurposefulCollectionsProps {
  listings: SafeListing[];
  weekendListings: SafeListing[];
  weekendStart: Date;
  weekendEnd: Date;
  currentUser?: SafeUser | null;
}

const PurposefulCollections = ({ listings, weekendListings, weekendStart, weekendEnd, currentUser }: PurposefulCollectionsProps) => {
  const popularPool = currentUser?.state ? listings.filter((listing) => listing.state === currentUser.state) : listings;
  const popular = [...popularPool]
    .filter((listing) => (listing.reviewCount || 0) > 0)
    .sort((a, b) => ((b.reviewAverage || 0) * Math.log2((b.reviewCount || 0) + 1)) - ((a.reviewAverage || 0) * Math.log2((a.reviewCount || 0) + 1)))
    .slice(0, 6);
  const workReady = listings.filter((listing) => ["Utes", "Vans", "Trucks"].includes(listing.category)).slice(0, 6);

  const collections = [
    {
      key: "weekend",
      title: "Available this weekend",
      subtitle: `${format(weekendStart, "d MMM")} – ${format(weekendEnd, "d MMM")} · availability checked`,
      icon: IconCalendarEvent,
      listings: weekendListings.slice(0, 6),
      tripDays: 2,
    },
    {
      key: "popular",
      title: currentUser?.state ? `Popular in ${currentUser.state}` : "Popular with Redrive guests",
      subtitle: "Ranked from real ratings and review confidence",
      icon: IconMapPinStar,
      listings: popular,
      tripDays: null,
    },
    {
      key: "work",
      title: "Work-ready utilities",
      subtitle: "Utes, vans and trucks for practical jobs",
      icon: IconBriefcase,
      listings: workReady,
      tripDays: null,
    },
  ].filter((collection) => collection.listings.length >= 3);

  if (collections.length === 0) return null;

  return (
    <section className="mb-10 space-y-9" aria-label="Featured vehicle collections">
      {collections.map((collection, collectionIndex) => <div key={collection.key}>
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary"><collection.icon size={19} /></span>
          <div><h2 className="text-lg font-semibold text-ink sm:text-xl">{collection.title}</h2><p className="mt-0.5 text-xs text-muted sm:text-sm">{collection.subtitle}</p></div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:gap-5">
          {collection.listings.map((listing, index) => <div key={listing.id} className="w-[238px] shrink-0 sm:w-[260px]"><ListingCard data={listing} currentUser={currentUser} compact tripDays={collection.tripDays} priority={collectionIndex === 0 && index < 2} /></div>)}
        </div>
      </div>)}
    </section>
  );
};

export default PurposefulCollections;
