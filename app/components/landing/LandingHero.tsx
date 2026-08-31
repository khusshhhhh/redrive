import Link from "next/link";
import { ArrowRight, CarFront } from "lucide-react";

import type { ListingCardData } from "@/app/libs/listingCardData";
import { BrowserFrame, PhoneFrame } from "./DeviceFrame";
import { BookingMock, BrowseGridMock } from "./mockups";
import Parallax from "./Parallax";
import BecomeHostLink from "@/app/components/BecomeHostLink";

export default function LandingHero({
  listings,
  liveCount = 0,
}: {
  listings: ListingCardData[];
  liveCount?: number;
}) {
  return (
    <section className="aurora relative isolate flex min-h-[82svh] items-start overflow-hidden sm:min-h-[100svh] sm:items-center">
      {/* static monochrome wireframe cubes behind the headline */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <HeroCube size={128} className="right-[3%] top-14 hidden opacity-50 lg:block" />
        <HeroCube size={72} className="left-[5%] top-[38%] hidden opacity-35 lg:block" />
        <HeroCube size={96} className="right-[10%] bottom-[9%] hidden opacity-25 lg:block" />
        <HeroCube size={56} className="left-[2%] bottom-[16%] hidden opacity-40 xl:block" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-14 sm:gap-14 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pb-24 lg:pt-20">
        <div className="fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary backdrop-blur">
            <CarFront size={13} className="text-yellow-500" /> Peer-to-peer vehicle hire · Australia
          </span>
          <h1 className="mt-6 text-display-hero font-extrabold tracking-tight text-ink">
            The vehicle
            <br />
            your plan needs
            <span className="text-yellow-500">.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted">
            Utes for the weekend job. Campervans for the long way home. Rent a useful vehicle from a local host, or earn
            from the one sitting in your driveway.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-white transition-colors hover:bg-primary-active"
            >
              Explore vehicles
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <BecomeHostLink className="inline-flex h-[52px] items-center gap-2 rounded-full border border-border-strong bg-white/80 px-7 text-sm font-semibold text-ink backdrop-blur transition-colors hover:border-ink hover:bg-white">
              Become a host
            </BecomeHostLink>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-soft">
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-ink">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
                </span>
                {liveCount.toLocaleString()} vehicles listed across Australia
              </span>
            )}
            <span>No membership fees · Free to list · Cancel any time before a host accepts</span>
          </p>
        </div>

        <Parallax distance={-28} className="fade-in relative mx-auto w-full max-w-[560px]">
          <BrowserFrame url="redrive.com.au/explore" label="Redrive vehicle marketplace" className="rotate-[-1.5deg]">
            <div className="max-h-[340px] overflow-hidden">
              <BrowseGridMock listings={listings.slice(0, 6)} />
            </div>
          </BrowserFrame>

          <div className="absolute -bottom-10 -left-4 hidden lg:block">
            <PhoneFrame label="Redrive booking screen" className="w-[188px] rotate-[3deg]">
              <BookingMock
                cover={listings[0]?.imageSrcs?.[0]}
                title={listings[0]?.title ?? "Ford Ranger — dual cab"}
                suburb={listings[0]?.suburb ?? "Brunswick"}
              />
            </PhoneFrame>
          </div>
        </Parallax>
      </div>
    </section>
  );
}

/** One static monochrome wireframe cube, positioned by `className`. */
function HeroCube({ size, className }: { size: number; className?: string }) {
  const z = size / 2;
  const faces = [
    `translateZ(${z}px)`,
    `rotateY(180deg) translateZ(${z}px)`,
    `rotateY(90deg) translateZ(${z}px)`,
    `rotateY(-90deg) translateZ(${z}px)`,
    `rotateX(90deg) translateZ(${z}px)`,
    `rotateX(-90deg) translateZ(${z}px)`,
  ];
  return (
    <div className={`scene-3d pointer-events-none absolute ${className ?? ""}`}>
      <div className="hero-cube relative" style={{ width: size, height: size }}>
        {faces.map((transform) => (
          <span key={transform} className="hero-cube__face" style={{ transform }} />
        ))}
      </div>
    </div>
  );
}
