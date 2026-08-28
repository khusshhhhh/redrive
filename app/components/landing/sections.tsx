"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, MapPinned, Sparkles } from "lucide-react";

import { categories } from "@/app/components/navbar/Categories";
import Reveal from "./Reveal";
import CountUp from "./CountUp";
import SplitText from "./SplitText";
import Tilt from "./Tilt";

/* ── Stats strip ───────────────────────────────────────────────────────── */

export function TrustBar() {
  return (
    <section className="border-y border-hairline-soft bg-surface-soft/60">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-5 py-2 sm:px-8 lg:grid-cols-4">
        {[
          { value: <CountUp to={10} />, label: "Vehicle categories" },
          { value: <CountUp to={8} />, label: "States & territories" },
          { value: <CountUp to={5} suffix=" min" />, label: "Average time to list" },
          { value: "AU$0", label: "Cost to list your vehicle" },
        ].map((stat, i) => (
          <Reveal key={i} delay={i * 70} className="group px-2 py-8 text-center">
            <p className="text-display-2xl font-extrabold tracking-tight text-ink transition-[transform,color] duration-500 group-hover:-translate-y-1 group-hover:text-yellow-500">
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted">{stat.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Category marquee ──────────────────────────────────────────────────── */

function CategoryChip({ label, Icon }: { label: string; Icon: () => React.ReactNode }) {
  return (
    <span className="group/chip inline-flex shrink-0 items-center gap-2.5 rounded-full border border-hairline bg-white px-5 py-3 text-sm font-semibold text-ink shadow-[0_6px_18px_-12px_rgba(59,59,59,0.4)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_16px_34px_-16px_rgba(59,59,59,0.55)]">
      <span className="inline-flex text-ink transition-[transform,color] duration-300 group-hover/chip:-rotate-12 group-hover/chip:text-yellow-500">
        <Icon />
      </span>
      {label}
    </span>
  );
}

export function CategoryMarquee() {
  const doubled = [...categories, ...categories];
  return (
    <section className="overflow-hidden py-14 lg:py-20">
      <div className="mx-auto mb-8 max-w-6xl px-5 sm:px-8">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
          Whatever the plan
        </p>
        <h2 className="mt-3 text-display-2xl font-extrabold tracking-tight text-ink">
          <SplitText text="One marketplace, every kind of vehicle." />
        </h2>
      </div>
      <div className="marquee-mask group/marquee space-y-4">
        <div className="flex w-max animate-marquee gap-4 marquee-track">
          {doubled.map((item, i) => (
            <CategoryChip key={`a-${i}`} label={item.label} Icon={item.icon} />
          ))}
        </div>
        <div className="flex w-max animate-marquee-slow gap-4 marquee-track [animation-direction:reverse]">
          {doubled.map((item, i) => (
            <CategoryChip key={`b-${i}`} label={item.label} Icon={item.icon} />
          ))}
        </div>
      </div>
    </section>
  );
}

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
          <SplitText text="Three steps between you and the road." />
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <Reveal key={step.n} delay={i * 110}>
            <Tilt max={6} glare={false} className="h-full">
              <div className="lift group relative h-full overflow-hidden rounded-2xl border border-hairline-soft bg-white p-7 hover:border-border-strong hover:shadow-[0_28px_64px_-30px_rgba(59,59,59,0.5)]">
                <span className="text-[13px] font-black tracking-widest text-hairline transition-colors duration-300 group-hover:text-yellow-500">
                  {step.n}
                </span>
                <span className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-primary transition-[transform,color] duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:text-yellow-500">
                  <step.icon size={22} />
                </span>
                <h3 className="mt-5 text-xl font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </div>
            </Tilt>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Host CTA band ────────────────────────────────────────────────────── */

export function HostCtaBand() {
  return (
    <section className="px-5 pb-20 sm:px-8">
      <Reveal
        from="zoom"
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-graphite px-6 py-14 text-white sm:px-14 sm:py-20"
      >
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
          <Link
            href="/host"
            className="group mt-8 inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Become a host
            <ArrowRight
              size={17}
              className="text-ink transition-[transform,color] duration-300 group-hover:translate-x-1.5 group-hover:text-yellow-500"
            />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
