import Link from "next/link";
import { ArrowRight } from "lucide-react";

import getListings from "./actions/getListings";
import { toListingCardData, type ListingCardData } from "./libs/listingCardData";
import { buildSeoMetadata } from "./libs/seo";
import LandingHero from "./components/landing/LandingHero";
import FeatureShowcase from "./components/landing/FeatureShowcase";
import Reveal from "./components/landing/Reveal";
import SmoothScroll from "./components/landing/SmoothScroll";
import SplitText from "./components/landing/SplitText";
import { CategoryMarquee, HostCtaBand, HowItWorks, TrustBar } from "./components/landing/sections";

export const revalidate = 1800;

export const metadata = buildSeoMetadata({
  title: "Redrive — rent a useful vehicle, or earn from yours",
  description:
    "Redrive is Australia's marketplace for useful vehicles. Rent a ute, van or campervan from a local host, or list your own vehicle for free with a guided hosting flow.",
  path: "/",
  keywords: [
    "peer-to-peer vehicle hire Australia",
    "rent a ute",
    "campervan hire",
    "van hire Australia",
    "list your car",
    "become a host",
  ],
  imageAlt: "Redrive — useful vehicles shared locally across Australia",
});

/** Keeps the showcase grid full even before a region has many live listings. */
const FALLBACK_CARDS: ListingCardData[] = [
  { id: "s1", title: "Dual-cab ute — tow pack & tray", category: "Utes", suburb: "Brunswick", state: "VIC", price: 96, imageSrcs: [], badgeValue: null, reviewAverage: 4.9, reviewCount: 24, hostVerified: true, hostResponseHours: 0.5, instantBook: true },
  { id: "s2", title: "Compact campervan — sleeps two", category: "Motorhomes", suburb: "Fremantle", state: "WA", price: 145, imageSrcs: [], badgeValue: null, reviewAverage: 4.8, reviewCount: 41, hostVerified: true, hostResponseHours: 2, instantBook: false },
  { id: "s3", title: "City runabout — cheap on fuel", category: "Car", suburb: "Newtown", state: "NSW", price: 58, imageSrcs: [], badgeValue: null, reviewAverage: 4.7, reviewCount: 12, hostVerified: false, hostResponseHours: 6, instantBook: true },
  { id: "s4", title: "Long-wheelbase cargo van", category: "Vans", suburb: "Bowen Hills", state: "QLD", price: 89, imageSrcs: [], badgeValue: null, reviewAverage: 5, reviewCount: 8, hostVerified: true, hostResponseHours: 1, instantBook: false },
  { id: "s5", title: "Off-road wagon — roof tent ready", category: "Car", suburb: "Wanniassa", state: "ACT", price: 112, imageSrcs: [], badgeValue: null, reviewAverage: 4.9, reviewCount: 33, hostVerified: true, hostResponseHours: 3, instantBook: true },
  { id: "s6", title: "Twin-axle box trailer", category: "Trucks", suburb: "Prospect", state: "SA", price: 34, imageSrcs: [], badgeValue: null, reviewAverage: 4.6, reviewCount: 5, hostVerified: false, hostResponseHours: 12, instantBook: false },
];

export default async function Home() {
  let live: ListingCardData[] = [];
  try {
    const listings = await getListings({});
    live = listings.map(toListingCardData);
  } catch {
    live = [];
  }

  const seen = new Set(live.map((l) => l.id));
  const showcase = [...live, ...FALLBACK_CARDS.filter((f) => !seen.has(f.id))].slice(0, 6);

  return (
    <div className="overflow-x-clip">
      <SmoothScroll />
      <LandingHero listings={showcase} />
      <TrustBar />
      <FeatureShowcase listings={showcase} />
      <CategoryMarquee />
      <HowItWorks />

      <section className="mx-auto max-w-6xl px-5 pb-4 sm:px-8">
        <Reveal className="rounded-2xl border border-hairline-soft bg-surface-soft/50 p-8 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-display-2xl font-extrabold tracking-tight text-ink">
                <SplitText text="Ready when you are" />
                <span className="text-yellow-500">.</span>
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Browse what&rsquo;s available near you now, or jump straight into listing your own vehicle.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/explore"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-primary-active"
              >
                Explore vehicles
                <ArrowRight
                  size={16}
                  className="transition-[transform,color] duration-300 group-hover:translate-x-1.5 group-hover:text-yellow-500"
                />
              </Link>
              <Link
                href="/host"
                className="inline-flex h-12 items-center rounded-full border border-border-strong bg-white px-6 text-sm font-semibold text-ink transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-ink"
              >
                List your vehicle
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <HostCtaBand />
    </div>
  );
}
