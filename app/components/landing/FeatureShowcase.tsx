"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ListingCardData } from "@/app/libs/listingCardData";
import Reveal from "./Reveal";
import { BrowserFrame, PhoneFrame } from "./DeviceFrame";
import { BookingMock, BrowseGridMock, ChatMock, HostStepMock, ListingDetailMock, VerifiedList } from "./mockups";
import BecomeHostLink from "@/app/components/BecomeHostLink";

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
      eyebrow: "Know before you book",
      title: "Every rule and cost, on the listing.",
      body: "An “At a glance” strip covers transmission, distance limits, delivery and deposit. A “Before you book” panel spells out the rules that catch renters out — km caps, interstate limits, who's allowed to drive — in plain English.",
      cta: { label: "See a listing", href: "/explore" },
      visual: (
        <BrowserFrame url="redrive.com.au/listings" label="Redrive listing detail" className="rotate-[-1deg]">
          <div className="max-h-[440px] overflow-hidden">
            <ListingDetailMock
              cover={listings[2]?.imageSrcs?.[0] ?? listings[0]?.imageSrcs?.[0]}
              title={listings[2]?.title ?? "Toyota HiAce camper for road trips"}
              suburb={listings[2]?.suburb ?? "Brooklyn Park"}
            />
          </div>
        </BrowserFrame>
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
      body: "One question per screen, with a note on why each detail matters to guests. Photos, specs, trip rules, pricing and cancellation — nothing goes live until you publish.",
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
              <Reveal className={flip ? "lg:order-2" : ""}>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  {row.eyebrow}
                </p>
                <h2 className="mt-3 text-display-3xl font-extrabold tracking-tight text-ink">{row.title}</h2>
                <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted">{row.body}</p>
                {row.extra && <div className="mt-6">{row.extra}</div>}
                {row.cta && (() => {
                  const CtaTag = row.cta.href === "/host" ? BecomeHostLink : Link;
                  return (
                    <CtaTag
                      href={row.cta.href}
                      className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-ink"
                    >
                      <span className="hover-underline">{row.cta.label}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-ink transition-transform group-hover:translate-x-1">
                        <ArrowRight size={15} />
                      </span>
                    </CtaTag>
                  );
                })()}
              </Reveal>

              <Reveal delay={80} className={flip ? "lg:order-1" : ""}>
                {row.visual}
              </Reveal>
            </div>
          );
        })}
      </div>
    </section>
  );
}
