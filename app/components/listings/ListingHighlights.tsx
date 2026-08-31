"use client";

import type { ComponentType } from "react";
import {
  IconAutomaticGearbox,
  IconChargingPile,
  IconCoin,
  IconGasStation,
  IconGauge,
  IconManualGearbox,
  IconRoad,
  IconShieldCheck,
  IconTruckDelivery,
} from "@tabler/icons-react";

import type { SafeListing } from "@/app/types";

type Chip = { icon: ComponentType<{ size?: number; className?: string }>; label: string };

/**
 * A scannable "at a glance" row of the host-provided facts guests care about
 * most, shown near the top of the listing. Returns null when the host has not
 * filled in anything notable yet.
 */
export default function ListingHighlights({ listing }: { listing: SafeListing }) {
  const l = listing;
  const chips: Chip[] = [];

  if (l.transmission === "AUTOMATIC") chips.push({ icon: IconAutomaticGearbox, label: "Automatic" });
  else if (l.transmission === "MANUAL") chips.push({ icon: IconManualGearbox, label: "Manual" });

  if (l.odometer) chips.push({ icon: IconGauge, label: `${l.odometer.toLocaleString()} km` });

  if (l.fuelType === "EV" || l.fuelType === "Hybrid") {
    if (l.drivingRangeKm) chips.push({ icon: IconChargingPile, label: `${l.drivingRangeKm} km range` });
  } else if (l.fuelEconomy) {
    chips.push({ icon: IconGasStation, label: `${l.fuelEconomy} L/100km` });
  }

  chips.push({
    icon: IconRoad,
    label: l.dailyKmAllowance ? `${l.dailyKmAllowance.toLocaleString()} km/day` : "Unlimited km",
  });

  if (l.deliveryAvailable || l.airportPickup) {
    chips.push({ icon: IconTruckDelivery, label: l.airportPickup ? "Airport pickup" : "Delivery available" });
  }

  if (l.ancapRating) chips.push({ icon: IconShieldCheck, label: `ANCAP ${l.ancapRating}/5` });

  if (l.securityDeposit) chips.push({ icon: IconCoin, label: `AU$${l.securityDeposit.toLocaleString()} deposit` });

  // Only render once the host has added something beyond the always-present km chip.
  if (chips.length <= 1) return null;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="text-body-md font-medium text-ink">At a glance</div>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-1.5 text-body-sm font-medium text-ink"
            >
              <chip.icon size={16} className="text-muted" />
              {chip.label}
            </span>
          ))}
        </div>
      </div>
      <hr className="border-hairline-soft" />
    </>
  );
}
