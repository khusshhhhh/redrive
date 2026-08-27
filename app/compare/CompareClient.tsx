"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowsExchange, IconCheck, IconMinus, IconStar, IconX } from "@tabler/icons-react";
import useCompareVehicles from "../hooks/useCompareVehicles";
import type { ComparisonVehicle } from "../actions/getComparisonListings";

const responseLabel = (hours: number | null) => hours === null ? "Not enough history" : hours < 1 ? "Usually within an hour" : hours < 24 ? `Usually within ${Math.ceil(hours)} hours` : `Usually within ${Math.ceil(hours / 24)} days`;
type ComparisonRow = readonly [label: string, value: (vehicle: ComparisonVehicle) => string];
type ComparisonGroup = { title: string; copy: string; rows: readonly ComparisonRow[] };

const CompareClient = ({ vehicles, tripDays }: { vehicles: ComparisonVehicle[]; tripDays: number | null }) => {
  const router = useRouter();
  const { remove } = useCompareVehicles();
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const displayedVehicles = vehicles.filter((vehicle) => !removedIds.includes(vehicle.id));

  const groups: readonly ComparisonGroup[] = [
    { title: "Price & capacity", copy: "The essentials for your trip", rows: [
      ["Vehicle total", (v: ComparisonVehicle) => tripDays ? `AU$${(v.price * tripDays).toLocaleString()} for ${tripDays} days` : `AU$${v.price.toLocaleString()} per day`],
      ["Guest capacity", (v: ComparisonVehicle) => `${v.guestCount} people`],
      ["Sleeping capacity", (v: ComparisonVehicle) => v.sleepCount ? `${v.sleepCount} people` : "Not applicable"],
    ] },
    { title: "Vehicle details", copy: "What you will be driving", rows: [
      ["Doors", (v: ComparisonVehicle) => String(v.doorCount)],
      ["Transmission / drive", (v: ComparisonVehicle) => v.driveChain],
      ["Fuel", (v: ComparisonVehicle) => `${v.fuelType}${v.fuelEconomy ? ` · ${v.fuelEconomy} L/100km` : ""}`],
      ["Year", (v: ComparisonVehicle) => String(v.year)],
    ] },
    { title: "Trust & booking", copy: "Signals to help you decide", rows: [
      ["Reviews", (v: ComparisonVehicle) => v.reviewCount ? `${v.reviewAverage.toFixed(1)} from ${v.reviewCount}` : "No reviews yet"],
      ["Host verification", (v: ComparisonVehicle) => v.hostVerified ? "Verified host" : "Not yet verified"],
      ["Host response", (v: ComparisonVehicle) => responseLabel(v.hostResponseHours)],
      ["Instant Book", (v: ComparisonVehicle) => v.instantBook ? "Available" : "Request required"],
    ] },
    { title: "Included features", copy: "Highlights listed by each host", rows: [
      ["Features", (v: ComparisonVehicle) => v.amenities.slice(0, 5).join(", ") || "None listed"],
    ] },
  ];
  const rows = groups.flatMap((group) => group.rows);

  const handleRemove = (id: string) => {
    const remainingIds = displayedVehicles.filter((vehicle) => vehicle.id !== id).map((vehicle) => vehicle.id);
    setRemovedIds((current) => [...current, id]);
    remove(id);

    const params = new URLSearchParams(window.location.search);
    if (remainingIds.length) params.set("ids", remainingIds.join(","));
    else params.delete("ids");
    router.replace(`/compare?${params.toString()}`, { scroll: false });
  };

  if (displayedVehicles.length < 2) return (
    <div className="mx-auto flex min-h-[62vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-strong text-primary"><IconArrowsExchange size={28} stroke={1.7} /></span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Vehicle comparison</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Choose at least two vehicles</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted">Use the Compare control on listing cards to add up to three vehicles, then return here to review them together.</p>
      <Link href="/" className="mt-7 inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Explore vehicles</Link>
    </div>
  );

  return (
    <div className="py-7 sm:py-10 lg:py-12">
      <header className="mb-6 sm:mb-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Decision helper</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Compare vehicles</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">Review the details side by side. Prices are estimates until you submit a booking request.</p></header>

      <div className={`grid gap-2.5 lg:hidden ${displayedVehicles.length === 2 ? "grid-cols-2" : "grid-cols-3"}`} aria-label="Vehicles being compared">
        {displayedVehicles.map((vehicle, index) => (
          <article key={vehicle.id} className="min-w-0 overflow-hidden rounded-2xl border border-hairline-soft bg-white shadow-[0_8px_28px_rgba(22, 22, 22,0.06)]">
            <div className="relative aspect-[4/3] bg-surface-soft">
              <Image src={vehicle.imageSrc} alt={`${vehicle.title} available in ${vehicle.suburb}, ${vehicle.state}`} fill sizes={displayedVehicles.length === 2 ? "50vw" : "34vw"} className="object-cover" />
              <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-[10px] font-bold text-white backdrop-blur-sm">{index + 1}</span>
              <button type="button" onClick={() => handleRemove(vehicle.id)} aria-label={`Remove ${vehicle.title}`} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><IconX size={17} /></button>
            </div>
            <div className="p-2.5 sm:p-3">
              <Link href={`/listings/${vehicle.id}`} className="line-clamp-2 text-xs font-semibold leading-4 text-ink hover:underline sm:text-sm sm:leading-5">{vehicle.title}</Link>
              <p className="mt-1 truncate text-[10px] text-muted sm:text-xs">{vehicle.suburb}, {vehicle.state}</p>
              <Link href={`/listings/${vehicle.id}`} className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-full border border-primary/20 px-2 text-[10px] font-semibold text-primary transition hover:bg-surface-soft sm:text-xs">View vehicle</Link>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 space-y-4 lg:hidden">
        {groups.map((group) => (
          <section key={group.title} className="overflow-hidden rounded-2xl border border-hairline-soft bg-white shadow-[0_8px_28px_rgba(22, 22, 22,0.045)]">
            <div className="border-b border-hairline-soft bg-surface-soft/65 px-4 py-3.5">
              <h2 className="text-sm font-semibold text-ink">{group.title}</h2>
              <p className="mt-0.5 text-[11px] text-muted">{group.copy}</p>
            </div>
            <div className="grid bg-white px-3 py-2.5" style={{ gridTemplateColumns: `repeat(${displayedVehicles.length}, minmax(0, 1fr))` }}>
              {displayedVehicles.map((vehicle, index) => <div key={vehicle.id} className="flex min-w-0 items-center gap-1.5 px-1 text-[10px] font-semibold text-muted"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-strong text-[9px] font-bold text-primary">{index + 1}</span><span className="truncate">{vehicle.title}</span></div>)}
            </div>
            {group.rows.map(([label, value]) => (
              <div key={label} className="border-t border-hairline-soft">
                <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
                <div className="grid px-3 pb-3 pt-2 [&>div+div]:border-l [&>div+div]:border-hairline-soft" style={{ gridTemplateColumns: `repeat(${displayedVehicles.length}, minmax(0, 1fr))` }}>
                  {displayedVehicles.map((vehicle) => <div key={vehicle.id} className="min-w-0 px-2 text-xs font-medium leading-5 text-ink first:pl-1 last:pr-1">{renderValue(label, vehicle, value(vehicle))}</div>)}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-hairline shadow-[0_12px_38px_rgba(22, 22, 22,0.05)] lg:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead><tr className="bg-surface-soft"><th className="sticky left-0 z-10 w-44 bg-surface-soft p-4 text-xs font-semibold uppercase tracking-wider text-muted">Compare</th>{displayedVehicles.map((vehicle) => <th key={vehicle.id} className="min-w-[230px] p-4 align-top"><div className="relative aspect-[3/2] overflow-hidden rounded-xl"><Image src={vehicle.imageSrc} alt={`${vehicle.title} available in ${vehicle.suburb}, ${vehicle.state}`} fill sizes="280px" className="object-cover" /></div><div className="mt-3 flex items-start justify-between gap-2"><div><Link href={`/listings/${vehicle.id}`} className="font-semibold text-ink hover:underline">{vehicle.title}</Link><p className="mt-1 text-xs font-normal text-muted">{vehicle.suburb}, {vehicle.state}</p></div><button type="button" onClick={() => handleRemove(vehicle.id)} aria-label={`Remove ${vehicle.title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><IconX size={17} /></button></div></th>)}</tr></thead>
          <tbody>{rows.map(([label, value]) => <tr key={label} className="border-t border-hairline-soft"><th className="sticky left-0 z-10 bg-white p-4 text-sm font-semibold text-ink">{label}</th>{displayedVehicles.map((vehicle) => <td key={vehicle.id} className="p-4 text-sm text-muted">{renderValue(label, vehicle, value(vehicle))}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

function renderValue(label: string, vehicle: ComparisonVehicle, value: string) {
  if (label === "Reviews" && vehicle.reviewCount) return <span className="inline-flex items-center gap-1.5 text-ink"><IconStar size={15} className="shrink-0 fill-accent text-accent" />{value}</span>;
  if (label === "Host verification") return <span className="inline-flex items-start gap-1.5">{vehicle.hostVerified ? <IconCheck size={16} className="mt-0.5 shrink-0 text-secondary" /> : <IconMinus size={16} className="mt-0.5 shrink-0" />}{value}</span>;
  if (label === "Instant Book") return <span className="inline-flex items-start gap-1.5">{vehicle.instantBook ? <IconCheck size={16} className="mt-0.5 shrink-0 text-secondary" /> : <IconMinus size={16} className="mt-0.5 shrink-0" />}{value}</span>;
  if (label === "Vehicle total") return <strong className="font-semibold text-primary">{value}</strong>;
  return value;
}

export default CompareClient;
