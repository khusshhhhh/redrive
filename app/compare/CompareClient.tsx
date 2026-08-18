"use client";

import Image from "next/image";
import Link from "next/link";
import { IconCheck, IconMinus, IconStar, IconX } from "@tabler/icons-react";
import useCompareVehicles from "../hooks/useCompareVehicles";
import type { ComparisonVehicle } from "../actions/getComparisonListings";

const responseLabel = (hours: number | null) => hours === null ? "Not enough history" : hours < 1 ? "Usually within an hour" : hours < 24 ? `Usually within ${Math.ceil(hours)} hours` : `Usually within ${Math.ceil(hours / 24)} days`;

const CompareClient = ({ vehicles, tripDays }: { vehicles: ComparisonVehicle[]; tripDays: number | null }) => {
  const { remove } = useCompareVehicles();
  if (vehicles.length < 2) return <div className="py-20 text-center"><h1 className="text-2xl font-semibold text-ink">Choose at least two vehicles</h1><p className="mt-2 text-sm text-muted">Use the Compare control on listing cards to add up to three.</p><Link href="/" className="mt-6 inline-flex rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-white">Explore vehicles</Link></div>;

  const rows = [
    ["Vehicle total", (v: ComparisonVehicle) => tripDays ? `AU$${v.price * tripDays} for ${tripDays} days` : `AU$${v.price} per day`],
    ["Guest capacity", (v: ComparisonVehicle) => `${v.guestCount} people`],
    ["Sleeping capacity", (v: ComparisonVehicle) => v.sleepCount ? `${v.sleepCount} people` : "Not applicable"],
    ["Doors", (v: ComparisonVehicle) => String(v.doorCount)],
    ["Transmission / drive", (v: ComparisonVehicle) => v.driveChain],
    ["Fuel", (v: ComparisonVehicle) => `${v.fuelType}${v.fuelEconomy ? ` · ${v.fuelEconomy} L/100km` : ""}`],
    ["Year", (v: ComparisonVehicle) => String(v.year)],
    ["Reviews", (v: ComparisonVehicle) => v.reviewCount ? `${v.reviewAverage.toFixed(1)} from ${v.reviewCount}` : "No reviews yet"],
    ["Host verification", (v: ComparisonVehicle) => v.hostVerified ? "Verified host" : "Not yet verified"],
    ["Host response", (v: ComparisonVehicle) => responseLabel(v.hostResponseHours)],
    ["Instant Book", (v: ComparisonVehicle) => v.instantBook ? "Available" : "Request required"],
    ["Features", (v: ComparisonVehicle) => v.amenities.slice(0, 5).join(", ") || "None listed"],
  ] as const;

  return (
    <div className="py-8 sm:py-12">
      <header className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Decision helper</p><h1 className="mt-2 text-3xl font-semibold text-ink">Compare vehicles</h1><p className="mt-2 text-sm text-muted">Review the facts side by side. Prices are estimates until you submit a booking request.</p></header>
      <div className="overflow-x-auto rounded-md border border-hairline">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead><tr className="bg-surface-soft"><th className="sticky left-0 z-10 w-44 bg-surface-soft p-4 text-xs font-semibold uppercase tracking-wider text-muted">Compare</th>{vehicles.map((vehicle) => <th key={vehicle.id} className="min-w-[230px] p-4 align-top"><div className="relative aspect-[3/2] overflow-hidden rounded-md"><Image src={vehicle.imageSrc} alt="" fill className="object-cover" /></div><div className="mt-3 flex items-start justify-between gap-2"><div><Link href={`/listings/${vehicle.id}`} className="font-semibold text-ink hover:underline">{vehicle.title}</Link><p className="mt-1 text-xs font-normal text-muted">{vehicle.suburb}, {vehicle.state}</p></div><button type="button" onClick={() => remove(vehicle.id)} aria-label={`Remove ${vehicle.title}`} className="rounded-full p-1.5 text-muted hover:bg-white hover:text-ink"><IconX size={17} /></button></div></th>)}</tr></thead>
          <tbody>{rows.map(([label, value]) => <tr key={label} className="border-t border-hairline-soft"><th className="sticky left-0 z-10 bg-white p-4 text-sm font-semibold text-ink">{label}</th>{vehicles.map((vehicle) => <td key={vehicle.id} className="p-4 text-sm text-muted">{label === "Reviews" && vehicle.reviewCount ? <span className="inline-flex items-center gap-1.5 text-ink"><IconStar size={16} className="fill-accent text-accent" />{value(vehicle)}</span> : label === "Host verification" ? <span className="inline-flex items-center gap-1.5">{vehicle.hostVerified ? <IconCheck size={16} className="text-secondary" /> : <IconMinus size={16} />}{value(vehicle)}</span> : value(vehicle)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

export default CompareClient;
