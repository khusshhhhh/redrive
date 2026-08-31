"use client";

import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  KeyRound,
  MapPinned,
  MessagesSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import Reveal from "./Reveal";
import BecomeHostLink from "@/app/components/BecomeHostLink";

/* ── How it works ─────────────────────────────────────────────────────── */

export function HowItWorks() {
  const steps = [
    { n: "01", title: "Find it", body: "Search your suburb and dates, then compare real vehicles from local hosts side by side.", icon: MapPinned },
    { n: "02", title: "Book it", body: "Send a request with your trip details. Message the host and confirm the handover.", icon: Sparkles },
    { n: "03", title: "Drive it", body: "Pick up, do your trip, drop it back. Reviews and trip records stay on Redrive.", icon: KeyRound },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-28">
      <Reveal>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
          How Redrive works
        </p>
        <h2 className="mt-3 max-w-2xl text-display-3xl font-extrabold tracking-tight text-ink">
          Three steps between you and the road.
        </h2>
      </Reveal>
      <div className="relative mt-14">
        {/* dashed route line linking the three steps on desktop */}
        <div
          aria-hidden="true"
          className="route-dash absolute left-0 right-0 top-[46px] hidden h-0.5 md:block"
        />
        <div className="relative grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal
              key={step.n}
              delay={index * 90}
              className="lift group relative h-full overflow-hidden rounded-2xl border border-hairline-soft bg-white p-7 hover:border-border-strong"
            >
              <span className="text-[13px] font-black tracking-widest text-hairline">{step.n}</span>
              <span className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-primary ring-4 ring-white">
                <step.icon size={22} />
              </span>
              <h3 className="mt-5 text-xl font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Host CTA band ────────────────────────────────────────────────────── */

export function HostCtaBand() {
  return (
    <section className="px-5 pb-20 sm:px-8">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-graphite px-6 py-14 text-white sm:px-14 sm:py-20">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[46px] border-white/[0.06]" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/[0.05] blur-2xl" />
        <div className="relative max-w-xl">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-500">
            <Sparkles size={13} /> Earn from your driveway
          </p>
          <h2 className="mt-4 text-display-3xl font-extrabold tracking-tight">
            Your vehicle could be working while you&rsquo;re not<span className="text-yellow-500">.</span>
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/65">
            List for free, set your own price and availability, and approve every request. The guided flow takes about
            five minutes.
          </p>
          <BecomeHostLink className="group mt-8 inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-ink transition-colors hover:bg-surface-soft">
            Become a host
            <ArrowRight size={17} className="text-ink transition-transform group-hover:translate-x-1" />
          </BecomeHostLink>
        </div>
      </Reveal>
    </section>
  );
}

/* ── Why Redrive ──────────────────────────────────────────────────────── */

const WHY = [
  {
    icon: ShieldCheck,
    title: "Verified hosts and renters",
    body: "ID checks, reviews and trip history on every profile. You always know who you're handing the keys to.",
  },
  {
    icon: Wallet,
    title: "One clear price",
    body: "Daily rate, service fee and any cleaning terms shown up front. Your card is only charged when a host accepts.",
  },
  {
    icon: MessagesSquare,
    title: "Everything on-platform",
    body: "Messaging, payments, receipts and reviews stay in Redrive, so there's a record if anything needs sorting out.",
  },
  {
    icon: CalendarClock,
    title: "Flexible cancellation",
    body: "Cancel a request any time before it's accepted, and each listing states its own cancellation window.",
  },
  {
    icon: BadgeCheck,
    title: "Real local vehicles",
    body: "No fleet stock photos. Every listing is someone's actual ute, van or camper, with the photos to prove it.",
  },
  {
    icon: MapPinned,
    title: "Australia-wide",
    body: "Hosts across every state and territory, from inner-city runabouts to outback-ready 4WDs.",
  },
];

export function WhyRedrive() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-28">
      <Reveal>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
          Why Redrive
        </p>
        <h2 className="mt-3 max-w-2xl text-display-3xl font-extrabold tracking-tight text-ink">
          Built to make sharing a vehicle feel safe.
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WHY.map((item, i) => (
          <Reveal
            key={item.title}
            delay={(i % 3) * 70}
            from={i % 2 ? "right" : "left"}
            className="lift group h-full rounded-2xl border border-hairline-soft bg-white p-7 hover:border-border-strong"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-primary">
              <item.icon size={22} />
            </span>
            <h3 className="mt-5 text-lg font-bold text-ink">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── FAQ ──────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: "How much does it cost to rent a vehicle?",
    a: "The host sets the daily rate. Redrive adds a small service fee, shown before you send a request. There are no membership or booking fees.",
  },
  {
    q: "When am I charged?",
    a: "Never at request time. Your card is only charged once the host accepts your trip. If they decline or don't respond, nothing is taken.",
  },
  {
    q: "What do I need to rent?",
    a: "A verified Redrive account, a valid Australian or overseas licence, and to be within the age range set on the listing. Some hosts ask for extra details before accepting.",
  },
  {
    q: "Is it free to list my vehicle?",
    a: "Yes. Listing is free, you set your own price and availability, and you approve every request. Redrive's fee only applies to completed trips.",
  },
  {
    q: "What happens if something goes wrong during a trip?",
    a: "Message the host first — most things are sorted quickly. Trip records, payments and reviews all stay on Redrive so support has the full picture if you need help.",
  },
];

export function HomeFaq() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:py-24">
      <Reveal>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
          Good to know
        </p>
        <h2 className="mt-3 text-display-3xl font-extrabold tracking-tight text-ink">
          Questions people ask first.
        </h2>
      </Reveal>
      <div className="mt-10 divide-y divide-hairline-soft border-y border-hairline-soft">
        {FAQS.map((item, i) => (
          <Reveal key={item.q} delay={i * 50}>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  size={18}
                  className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-45"
                />
              </summary>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">{item.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
