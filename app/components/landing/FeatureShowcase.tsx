"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ListingCardData } from "@/app/libs/listingCardData";
import Reveal from "./Reveal";
import Tilt from "./Tilt";
import SplitText from "./SplitText";
import { BrowserFrame, PhoneFrame } from "./DeviceFrame";
import { BookingMock, BrowseGridMock, ChatMock, HostStepMock, VerifiedList } from "./mockups";

interface Row {
  eyebrow: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  extra?: React.ReactNode;
  visual: React.ReactNode;
}

export default function FeatureShowcase({ listings }: { listings: ListingCardData[] }) {
  const rows: Row[] = [
    {
      eyebrow: "Explore",
      title: "Browse vehicles the way locals do.",
      body: "Filter by vehicle type, dates and suburb. Every listing shows the real photos, the daily price and the host's response time before you ever send a message.",
      cta: { label: "Open the marketplace", href: "/explore" },
      visual: (
        <BrowserFrame url="redrive.com.au/explore" label="Redrive marketplace" className="rotate-[1deg]">
          <div className="max-h-[420px] overflow-hidden">
            <BrowseGridMock listings={listings.slice(0, 6)} />
          </div>
        </BrowserFrame>
      ),
    },
    {
      eyebrow: "Book",
      title: "Request in a tap. Pay only when it’s accepted.",
      body: "See the full price breakdown up front — nightly rate, service fee, cleaning terms. Send a request and your card is only charged once the host says yes.",
      extra: <VerifiedList />,
      visual: (
        <div className="flex justify-center">
          <PhoneFrame label="Redrive booking screen" className="rotate-[-2deg]">
            <BookingMock
              cover={listings[1]?.imageSrcs?.[0] ?? listings[0]?.imageSrcs?.[0]}
              title={listings[1]?.title ?? listings[0]?.title ?? "Toyota HiAce campervan"}
              suburb={listings[1]?.suburb ?? listings[0]?.suburb ?? "Fremantle"}
            />
          </PhoneFrame>
        </div>
      ),
    },
    {
      eyebrow: "Message",
      title: "Talk to the host in real time.",
      body: "Live chat with typing indicators and read receipts. Sort out pick-up, questions and handover before the trip — all kept on-platform.",
      visual: (
        <div className="flex justify-center">
          <PhoneFrame label="Redrive messaging screen" className="rotate-[2deg]">
            <ChatMock />
          </PhoneFrame>
        </div>
      ),
    },
    {
      eyebrow: "Host",
      title: "List your vehicle in a few minutes.",
      body: "A guided flow walks you through photos, pricing, registration and cancellation — one question per screen. Nothing goes live until you publish.",
      cta: { label: "Start hosting", href: "/host" },
      visual: (
        <div className="flex justify-center">
          <PhoneFrame label="Redrive hosting flow" className="rotate-[-2deg]">
            <HostStepMock />
          </PhoneFrame>
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-28">
      <div className="space-y-24 lg:space-y-36">
        {rows.map((row, index) => {
          const flip = index % 2 === 1;
          return (
            <div
              key={row.title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <Reveal from={flip ? "right" : "left"} className={flip ? "lg:order-2" : ""}>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  {row.eyebrow}
                </p>
                <h2 className="mt-3 text-display-3xl font-extrabold tracking-tight text-ink">
                  <SplitText text={row.title} />
                </h2>
                <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted">{row.body}</p>
                {row.extra && <div className="mt-6">{row.extra}</div>}
                {row.cta && (
                  <Link
                    href={row.cta.href}
                    className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-ink"
                  >
                    <span className="hover-underline">{row.cta.label}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-ink transition-[transform,color,border-color] duration-300 group-hover:translate-x-1 group-hover:border-yellow-500 group-hover:text-yellow-500">
                      <ArrowRight size={15} />
                    </span>
                  </Link>
                )}
              </Reveal>

              <Reveal from="zoom" delay={80} className={flip ? "lg:order-1" : ""}>
                <Tilt max={7} glare={false}>
                  {row.visual}
                </Tilt>
              </Reveal>
            </div>
          );
        })}
      </div>
    </section>
  );
}
