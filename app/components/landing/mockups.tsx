"use client";

import Image from "next/image";
import {
  IconAlertTriangle,
  IconAutomaticGearbox,
  IconChargingPile,
  IconCoin,
  IconGauge,
  IconRoad,
  IconShieldCheck,
  IconStar,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";

import type { ListingCardData } from "@/app/libs/listingCardData";
import ListingCard from "@/app/components/listings/ListingCard";

/**
 * Composed "screenshots" for the landing page. Each renders real Redrive UI —
 * either an actual component (ListingCard) or a faithful reconstruction using
 * the same design tokens — so the marketing surface never drifts from the app.
 */

export function BrowseGridMock({ listings }: { listings: ListingCardData[] }) {
  return (
    <div className="pointer-events-none select-none bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white">All vehicles</span>
        <span className="rounded-full border border-hairline px-3 py-1 text-[11px] font-medium text-muted">Utes</span>
        <span className="hidden rounded-full border border-hairline px-3 py-1 text-[11px] font-medium text-muted sm:inline">
          Campervans
        </span>
        <span className="ml-auto text-[11px] font-medium text-muted">{listings.length} results</span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {listings.map((data) => (
          <ListingCard key={data.id} data={data} currentUser={null} />
        ))}
      </div>
    </div>
  );
}

export function BookingMock({ cover, title, suburb }: { cover?: string; title: string; suburb: string }) {
  return (
    <div className="pointer-events-none select-none bg-white">
      <div className="relative aspect-[4/3] w-full bg-surface-strong">
        {cover ? (
          <Image src={cover} alt="" fill sizes="260px" className="object-cover" />
        ) : (
          <div className="h-full w-full bg-mist" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
          Instant book
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="line-clamp-1 text-sm font-bold text-ink">{title}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted">
            <IconStar size={12} className="fill-accent text-accent" /> 4.9 · {suburb}
          </p>
        </div>
        <div className="rounded-xl border border-hairline-soft p-3">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="font-semibold uppercase tracking-wide text-muted-soft">Pick-up</p>
              <p className="font-semibold text-ink">Sat 14 Sep</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-muted-soft">Drop-off</p>
              <p className="font-semibold text-ink">Mon 16 Sep</p>
            </div>
          </div>
        </div>
        <div className="space-y-1.5 text-[11px] text-muted">
          <div className="flex justify-between">
            <span>AU$92 × 2 days</span>
            <span className="text-ink">AU$184</span>
          </div>
          <div className="flex justify-between">
            <span>Service fee</span>
            <span className="text-ink">AU$22</span>
          </div>
          <div className="flex justify-between border-t border-hairline-soft pt-1.5 text-[12px] font-bold text-ink">
            <span>Total</span>
            <span>AU$206</span>
          </div>
        </div>
        <div className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-semibold text-white">
          Request to book <ArrowRight size={14} />
        </div>
        <p className="flex items-center justify-center gap-1 text-[10px] text-muted">
          <ShieldCheck size={12} /> You won&rsquo;t be charged yet
        </p>
      </div>
    </div>
  );
}

export function ListingDetailMock({ cover, title, suburb }: { cover?: string; title: string; suburb: string }) {
  const chips = [
    { icon: IconAutomaticGearbox, label: "Automatic" },
    { icon: IconGauge, label: "68,000 km" },
    { icon: IconChargingPile, label: "800 km range" },
    { icon: IconRoad, label: "200 km/day" },
    { icon: IconTruckDelivery, label: "Airport pickup" },
    { icon: IconShieldCheck, label: "ANCAP 4/5" },
    { icon: IconCoin, label: "AU$750 deposit" },
  ];
  return (
    <div className="pointer-events-none select-none bg-white p-4 sm:p-6">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="relative col-span-2 row-span-2 aspect-[4/3] overflow-hidden rounded-lg bg-surface-strong">
          {cover ? <Image src={cover} alt="" fill sizes="320px" className="object-cover" /> : <div className="h-full w-full bg-mist" />}
        </div>
        <div className="aspect-square rounded-lg bg-surface-strong" />
        <div className="aspect-square rounded-lg bg-surface-strong" />
      </div>
      <p className="mt-4 text-sm font-bold text-ink">{title}</p>
      <p className="flex items-center gap-1 text-[11px] text-muted">
        <IconStar size={12} className="fill-accent text-accent" /> 4.9 · Motorhome · {suburb}
      </p>

      <p className="mt-4 text-[11px] font-semibold text-ink">At a glance</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink"
          >
            <chip.icon size={11} className="text-muted" />
            {chip.label}
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-hairline bg-surface-soft p-3">
        <div className="flex items-center gap-1.5 text-ink">
          <IconAlertTriangle size={13} />
          <span className="text-[11px] font-semibold">Before you book</span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {[
            "Capped at 200 km/day — AU$0.33/km after that.",
            "AU$750 security deposit is held, separate from the total.",
            "No interstate travel; P-plate drivers not accepted.",
          ].map((point) => (
            <li key={point} className="flex gap-1.5 text-[10px] leading-snug text-body">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ChatMock() {
  const messages = [
    { from: "them", text: "Hi — the ute is free that weekend." },
    { from: "me", text: "Perfect. Can I pick up Friday evening?" },
    { from: "them", text: "Yep, from 6pm. I’ll send the address once it’s confirmed." },
    { from: "me", text: "Booking it now — thanks." },
  ];
  return (
    <div className="pointer-events-none flex h-full select-none flex-col bg-white">
      <div className="flex items-center gap-2.5 border-b border-hairline-soft px-4 py-3">
        <span className="h-8 w-8 rounded-full bg-ash-ring" />
        <div>
          <p className="text-xs font-bold text-ink">Marcus T.</p>
          <p className="flex items-center gap-1 text-[10px] text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Active now
          </p>
        </div>
      </div>
      <div className="chat-canvas flex flex-1 flex-col gap-2 p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[78%] rounded-2xl px-3 py-2 text-[11px] leading-snug ${
              m.from === "me"
                ? "self-end rounded-br-sm bg-primary text-white"
                : "self-start rounded-bl-sm border border-hairline-soft bg-white text-ink"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="border-t border-hairline-soft p-3">
        <div className="flex h-9 items-center rounded-full border border-hairline px-3 text-[11px] text-muted-soft">
          Message Marcus…
        </div>
      </div>
    </div>
  );
}

export function HostStepMock() {
  return (
    <div className="pointer-events-none flex h-full select-none flex-col bg-white">
      <div className="border-b border-hairline-soft px-4 py-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-muted-soft">
          <span>Part 1 · Tell us about your vehicle</span>
          <span>3 / 20</span>
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-surface-strong">
          <div className="h-full rounded-full bg-primary" style={{ width: "15%" }} />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="border-b border-hairline-soft bg-surface-soft/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-9 rounded-sm border border-hairline bg-white" />
            <span className="h-6 flex-1 rounded-sm bg-hairline-soft" />
          </div>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">Why it matters</p>
          <p className="mt-1 text-[10px] leading-snug text-muted">
            Automatic vs manual is a hard filter for a lot of drivers.
          </p>
        </div>
        <div className="flex-1 p-4">
          <p className="text-base font-extrabold leading-tight tracking-tight text-ink">Share a few basics</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-ink">
              <span>People</span>
              <span className="flex items-center gap-2 text-muted-soft">− <b className="text-ink">4</b> +</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="rounded-sm border-2 border-ink bg-ink px-3 py-2 text-center text-[10px] font-semibold text-white">Automatic</span>
              <span className="rounded-sm border border-hairline px-3 py-2 text-center text-[10px] font-semibold text-ink">Manual</span>
            </div>
            <div className="h-9 rounded-sm border border-hairline" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-hairline-soft px-4 py-3">
        <span className="text-[11px] font-semibold text-ink underline underline-offset-2">Back</span>
        <span className="flex h-9 items-center gap-1 rounded-full bg-primary px-4 text-[11px] font-semibold text-white">
          Next <ArrowRight size={12} />
        </span>
      </div>
    </div>
  );
}

export function VerifiedList() {
  return (
    <ul className="space-y-2.5">
      {["ID checks for hosts and guests", "Clear cancellation terms up front", "On-platform trip and payment records"].map(
        (item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-muted">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
              <Check size={12} strokeWidth={3} />
            </span>
            {item}
          </li>
        ),
      )}
    </ul>
  );
}
