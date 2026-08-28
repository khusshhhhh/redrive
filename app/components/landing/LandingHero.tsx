"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, CarFront } from "lucide-react";

import type { ListingCardData } from "@/app/libs/listingCardData";
import { BrowserFrame, PhoneFrame } from "./DeviceFrame";
import { BookingMock, BrowseGridMock } from "./mockups";
import SplitText from "./SplitText";
import BecomeHostLink from "@/app/components/BecomeHostLink";

export default function LandingHero({ listings }: { listings: ListingCardData[] }) {
  const scene = useRef<HTMLDivElement>(null);
  const tiltInner = useRef<HTMLDivElement>(null);

  // Vertical drift on scroll (fallback for browsers without scroll-timeline).
  useEffect(() => {
    const node = scene.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia?.("(max-width: 1023px)").matches) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const shift = Math.min(56, window.scrollY * 0.075);
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

  // Pointer-reactive 3D tilt on the device cluster.
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltInner.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--ry", `${(px * 14).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-py * 12).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
  };
  const onPointerLeave = () => {
    const el = tiltInner.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <section className="aurora animate-gradient-pan relative isolate flex min-h-[100svh] items-center overflow-hidden">
      {/* monochrome 3D wireframe cubes, drifting behind the headline */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <HeroCube size={128} className="right-[3%] top-14 hidden opacity-60 lg:block" duration={42} />
        <HeroCube size={72} className="left-[5%] top-[38%] hidden opacity-40 lg:block" duration={33} delay={-12} />
        <HeroCube size={96} className="right-[10%] bottom-[9%] hidden opacity-30 lg:block" duration={50} delay={-24} />
        <HeroCube size={56} className="left-[2%] bottom-[16%] hidden opacity-45 xl:block" duration={28} delay={-6} />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-16 pt-24 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pb-24 lg:pt-20">
        <div className="relative animate-[fadeIn_0.8s_ease-out_both]">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary backdrop-blur">
            <CarFront size={13} className="text-yellow-500" /> Peer-to-peer vehicle hire · Australia
          </span>
          <h1 className="mt-6 text-display-hero font-extrabold tracking-tight text-ink">
            <SplitText text="The vehicle" />
            <br />
            <SplitText text="your plan needs" />
            <span className="text-yellow-500">.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted">
            Utes for the weekend job. Campervans for the long way home. Rent a useful vehicle from a local host, or earn
            from the one sitting in your driveway.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-white transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-primary-active"
            >
              Explore vehicles
              <ArrowRight
                size={17}
                className="transition-[transform,color] duration-300 group-hover:translate-x-1.5 group-hover:text-yellow-500"
              />
            </Link>
            <BecomeHostLink
              className="inline-flex h-[52px] items-center gap-2 rounded-full border border-border-strong bg-white/80 px-7 text-sm font-semibold text-ink backdrop-blur transition-[background-color,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-ink hover:bg-white"
            >
              Become a host
            </BecomeHostLink>
          </div>
          <p className="mt-6 text-xs font-medium text-muted-soft">
            No membership fees · Free to list · Cancel a request any time before it&rsquo;s accepted
          </p>
        </div>

        <div
          ref={scene}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="tilt relative mx-auto w-full max-w-[560px] lg:[transform:translateY(var(--hero-shift,0px))]"
        >
          <div ref={tiltInner} className="tilt-inner relative">
            <span className="tilt-glare" />
            <div className="animate-floaty [animation-duration:9s]">
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

            <div className="absolute -bottom-10 -left-4 hidden animate-floaty [animation-delay:1.5s] [animation-duration:7.5s] sm:block [transform:translateZ(60px)]">
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
      </div>
    </section>
  );
}

/** One slowly rotating monochrome wireframe cube, positioned by `className`. */
function HeroCube({
  size,
  className,
  duration = 42,
  delay = 0,
}: {
  size: number;
  className?: string;
  duration?: number;
  delay?: number;
}) {
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
    <div className={`scene-3d parallax-slow pointer-events-none absolute ${className ?? ""}`}>
      <div
        className="hero-cube relative"
        style={{ width: size, height: size, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
      >
        {faces.map((transform) => (
          <span key={transform} className="hero-cube__face" style={{ transform }} />
        ))}
      </div>
    </div>
  );
}
