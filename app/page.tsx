import Link from "next/link";
import { ArrowRight } from "lucide-react";

import getHomeData from "./actions/getHomeData";
import { type ListingCardData } from "./libs/listingCardData";
import { buildSeoMetadata } from "./libs/seo";
import BecomeHostLink from "./components/BecomeHostLink";
import LandingHero from "./components/landing/LandingHero";
import FeatureShowcase from "./components/landing/FeatureShowcase";
import Reveal from "./components/landing/Reveal";
import LiveListingsRail from "./components/landing/LiveListingsRail";
import CategoryExplorer from "./components/landing/CategoryExplorer";
import PriceEstimator from "./components/landing/PriceEstimator";
import CoveragePanel from "./components/landing/CoveragePanel";
import GuestVoices from "./components/landing/GuestVoices";
import { FALLBACK_CARDS } from "./components/landing/fallbackCards";
import { HomeFaq, HostCtaBand, HowItWorks, WhyRedrive } from "./components/landing/sections";

export const revalidate = 1800;

export const metadata = buildSeoMetadata({
  title: "Redrive — rent a useful vehicle, or earn from yours",
  description:
    "Redrive is Australia’s marketplace for useful vehicles. Rent a ute, van or campervan from a local host, or list your own vehicle for free with a guided hosting flow.",
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

export default async function Home() {
  const home = await getHomeData();

  const seen = new Set(home.cards.map((card) => card.id));
  const showcase: ListingCardData[] = [
    ...home.cards,
    ...FALLBACK_CARDS.filter((card) => !seen.has(card.id)),
  ].slice(0, 6);

  return (
    <div className="overflow-x-clip">
      <LandingHero listings={showcase} />
      <LiveListingsRail cards={home.fresh.length ? home.fresh : home.cards} />
      <CategoryExplorer />
      <FeatureShowcase listings={showcase} />
      <PriceEstimator />
      <HowItWorks />
      <CoveragePanel />
      <WhyRedrive />
      <GuestVoices reviews={home.reviews} />
      <HomeFaq />

      <section className="mx-auto max-w-6xl px-5 pb-4 sm:px-8">
        <Reveal className="rounded-2xl border border-hairline-soft bg-surface-soft/50 p-8 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-display-2xl font-extrabold tracking-tight text-ink">
                Ready when you are<span className="text-yellow-500">.</span>
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Browse what&rsquo;s available near you now, or jump straight into listing your own vehicle.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/explore"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-ink transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-accent-active hover:text-white"
              >
                Explore vehicles
                <ArrowRight
                  size={16}
                  className="transition-[transform,color] duration-300 group-hover:translate-x-1.5 group-hover:text-yellow-500"
                />
              </Link>
              <BecomeHostLink className="inline-flex h-12 items-center rounded-full border border-border-strong bg-white px-6 text-sm font-semibold text-ink transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-ink">
                List your vehicle
              </BecomeHostLink>
            </div>
          </div>
        </Reveal>
      </section>

      <HostCtaBand />
    </div>
  );
}
