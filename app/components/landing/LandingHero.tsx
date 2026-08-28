"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, CarFront } from "lucide-react";

import type { ListingCardData } from "@/app/libs/listingCardData";
import { BrowserFrame, PhoneFrame } from "./DeviceFrame";
import { BookingMock, BrowseGridMock } from "./mockups";

export default function LandingHero({ listings }: { listings: ListingCardData[] }) {
  const cluster = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = cluster.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia?.("(max-width: 1023px)").matches) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const shift = Math.min(60, window.scrollY * 0.08);
        node.style.setProperty("--hero-shift", `-${shift.toFixed(1)}px`);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="aurora animate-gradient-pan relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pb-24 lg:pt-20">
        <div className="reveal is-revealed">
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary backdrop-blur">
            <CarFront size={13} /> Peer-to-peer vehicle hire · Australia
          </span>
          <h1 className="mt-6 text-display-hero font-extrabold tracking-tight text-ink">
            The vehicle
            <br />
            your plan needs.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted">
            Utes for the weekend job. Campervans for the long way home. Rent a useful vehicle from a local host, or earn
            from the one sitting in your driveway.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-white transition hover:bg-primary-active"
            >
              Explore vehicles
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/host"
              className="inline-flex h-[52px] items-center gap-2 rounded-full border border-border-strong bg-white/80 px-7 text-sm font-semibold text-ink backdrop-blur transition hover:border-ink hover:bg-white"
            >
              Become a host
            </Link>
          </div>
          <p className="mt-6 text-xs font-medium text-muted-soft">
            No membership fees · Free to list · Cancel a request any time before it&rsquo;s accepted
          </p>
        </div>

        <div
          ref={cluster}
          className="relative mx-auto w-full max-w-[560px] transition-transform duration-100 ease-out lg:[transform:translateY(var(--hero-shift,0px))]"
        >
          <div className="animate-floaty [animation-duration:8s]">
            <BrowserFrame
              url="redrive.com.au/explore"
              label="Redrive vehicle marketplace"
              className="rotate-[-1.5deg]"
            >
              <div className="max-h-[340px] overflow-hidden">
                <BrowseGridMock listings={listings.slice(0, 6)} />
              </div>
            </BrowserFrame>
          </div>

          <div className="absolute -bottom-10 -left-4 hidden animate-floaty [animation-delay:1.5s] [animation-duration:7s] sm:block">
            <PhoneFrame label="Redrive booking screen" className="w-[188px] rotate-[3deg]">
              <BookingMock
                cover={listings[0]?.imageSrcs?.[0]}
                title={listings[0]?.title ?? "Ford Ranger — dual cab"}
                suburb={listings[0]?.suburb ?? "Brunswick"}
              />
            </PhoneFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
