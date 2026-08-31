"use client";

import Image from "next/image";
import type { ComponentType } from "react";
import {
  IconCar4wd,
  IconChargingPile,
  IconGauge,
  IconHistory,
  IconLuggage,
  IconReceipt2,
  IconRoad,
  IconShieldCheck,
  IconToolsKitchen3,
  IconTruckDelivery,
} from "@tabler/icons-react";

import type { SafeListing } from "@/app/types";
import {
  SAFETY_FEATURES_LIST,
  categorySpecGroup,
  factName,
  optionLabel,
} from "@/app/libs/vehicleFacts";

type Row = [label: string, value: React.ReactNode];

const money = (value?: number | null) => (value || value === 0 ? `AU$${value.toLocaleString()}` : null);
const km = (value?: number | null) => (value ? `${value.toLocaleString()} km` : null);
const allowed = (value?: boolean | null) => (value ? "Allowed" : "Not allowed");

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-center gap-3 text-ink">
          <Icon size={18} />
          <div className="text-body-md font-medium">{title}</div>
        </div>
        <div className="ml-7">{children}</div>
      </div>
      <hr className="border-hairline-soft" />
    </>
  );
}

/** Renders label/value pairs, skipping any row whose value is null/undefined/"". */
function Facts({ rows }: { rows: Row[] }) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (visible.length === 0) return null;
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {visible.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-hairline-soft py-2 text-body-sm">
          <dt className="text-muted">{label}</dt>
          <dd className="text-right font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const hasAny = (...values: unknown[]) =>
  values.some((value) => value === true || (typeof value === "number" && value > 0) || (typeof value === "string" && value.trim() !== ""));

const ListingDetails: React.FC<{ listing: SafeListing }> = ({ listing }) => {
  const l = listing;
  const isElectrified = l.fuelType === "EV" || l.fuelType === "Hybrid";
  const specGroup = categorySpecGroup(l.category);

  const showSpecs = hasAny(l.transmission, l.odometer, l.seatbeltCount, l.colour, l.keysProvided, l.fuelTankLitres, l.drivingRangeKm, l.hasTollTag, l.isofixPoints, l.childSeatsAvailable, l.luggageLargeBags, l.vehicleHeightMeters, l.groundClearanceMm);
  const showCharging = isElectrified && hasAny(l.batteryCapacityKwh, l.chargePortType, l.maxChargingKw, l.portableChargerIncluded);
  const showSafety = hasAny(l.ancapRating, l.safetyFeatures?.length, l.firstAidKit, l.fireExtinguisher);
  const showCondition = hasAny(l.damageNotes, l.damagePhotos?.length, l.lastServicedAt, l.lastServiceOdometer, l.tyreCondition, l.spareTyre, l.modifications, l.hasDashcam, l.hasGpsTracker) || l.smokeFree === false || l.petFree === false;
  const showRules = hasAny(l.dailyKmAllowance, l.excessKmFee, l.unsealedRoadsAllowed, l.offRoadAllowed, l.petsAllowed, l.smokingAllowed, l.trackDaysAllowed, l.additionalDriverFee, l.minimumDriverAge, l.minimumLicenceYears)
    || l.interstateAllowed === false || l.additionalDriversAllowed === false || l.provisionalLicenceAllowed === false || l.internationalLicenceAccepted === false || l.festivalsAllowed === false;
  const showDelivery = hasAny(l.deliveryAvailable, l.airportPickup, l.handoverMethod, l.pickupWindowStart, l.pickupWindowEnd, l.languagesSpoken?.length);
  const showCosts = hasAny(l.securityDeposit, l.weeklyDiscountPercent, l.monthlyDiscountPercent, l.lateReturnFeePerHour, l.refuellingFeePerLitre, l.tollHandling, l.finesAdminFee, l.roadsideAssistanceIncluded);
  const showCategory = specGroup !== null && (
    specGroup === "UTE" ? hasAny(l.payloadKg, l.gvmKg, l.towingCapacityBrakedKg, l.towingCapacityUnbrakedKg, l.towBarFitted, l.trayLengthMm, l.canopyFitted)
    : specGroup === "VAN" ? hasAny(l.loadVolumeCubicMetres, l.loadLengthMm, l.internalHeightMm, l.plyLined)
    : hasAny(l.sleepingConfiguration, l.bedDimensions, l.selfContained, l.freshWaterLitres, l.gasBottleKg, l.solarWatts, l.houseBatteryAmpHours, l.awningFitted, l.showerType, l.toiletType, l.requiresSpecialLicence)
  );

  if (!showSpecs && !showCharging && !showSafety && !showCondition && !showRules && !showDelivery && !showCosts && !showCategory) {
    return null;
  }

  return (
    <>
      {showSpecs && (
        <Section icon={IconGauge} title="Specifications">
          <Facts
            rows={[
              ["Transmission", optionLabel("transmission", l.transmission)],
              ["Odometer", km(l.odometer)],
              ["Seatbelts", l.seatbeltCount || null],
              ["Colour", l.colour || null],
              ["Sets of keys", l.keysProvided || null],
              [isElectrified ? "Driving range" : "Fuel tank", isElectrified ? km(l.drivingRangeKm) : l.fuelTankLitres ? `${l.fuelTankLitres} L` : null],
              ["ISOFIX points", l.isofixPoints || null],
              ["Child seats available", l.childSeatsAvailable || null],
              ["Luggage", l.luggageLargeBags ? `${l.luggageLargeBags} large${l.luggageCabinBags ? ` + ${l.luggageCabinBags} cabin` : ""}` : null],
              ["Vehicle height", l.vehicleHeightMeters ? `${l.vehicleHeightMeters} m` : null],
              ["Ground clearance", l.groundClearanceMm ? `${l.groundClearanceMm} mm` : null],
              ["E-tag fitted", l.hasTollTag ? "Yes" : null],
            ]}
          />
        </Section>
      )}

      {showCharging && (
        <Section icon={IconChargingPile} title="Charging">
          <Facts
            rows={[
              ["Battery capacity", l.batteryCapacityKwh ? `${l.batteryCapacityKwh} kWh` : null],
              ["Charge port", optionLabel("chargePortType", l.chargePortType)],
              ["Max DC charge rate", l.maxChargingKw ? `${l.maxChargingKw} kW` : null],
              ["Portable charger", l.portableChargerIncluded ? "Included" : null],
            ]}
          />
        </Section>
      )}

      {showSafety && (
        <Section icon={IconShieldCheck} title="Safety">
          <Facts
            rows={[
              ["ANCAP rating", l.ancapRating ? "★".repeat(l.ancapRating) + `  ${l.ancapRating}/5` : null],
              ["First-aid kit", l.firstAidKit ? "On board" : null],
              ["Fire extinguisher", l.fireExtinguisher ? "On board" : null],
            ]}
          />
          {l.safetyFeatures && l.safetyFeatures.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {l.safetyFeatures.map((id) => (
                <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-soft px-3 py-1 text-xs font-medium text-ink">
                  <IconShieldCheck size={13} /> {factName(SAFETY_FEATURES_LIST, id)}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {showCondition && (
        <Section icon={IconHistory} title="Condition & history">
          <Facts
            rows={[
              ["Last serviced", formatDate(l.lastServicedAt)],
              ["Odometer at last service", km(l.lastServiceOdometer)],
              ["Tyre condition", optionLabel("tyreCondition", l.tyreCondition)],
              ["Spare tyre & tools", l.spareTyre ? "On board" : null],
              ["Modifications", l.modifications || null],
              ["Smoke-free", l.smokeFree === false ? "No" : l.smokeFree ? "Yes" : null],
              ["Pet-free", l.petFree === false ? "No" : l.petFree ? "Yes" : null],
              ["Dashcam fitted", l.hasDashcam ? "Yes — may record" : null],
              ["GPS tracker fitted", l.hasGpsTracker ? "Yes" : null],
            ]}
          />
          {l.damageNotes && (
            <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-soft p-3 text-body-sm text-body">{l.damageNotes}</p>
          )}
          {l.damagePhotos && l.damagePhotos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {l.damagePhotos.map((src) => (
                <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-hairline-soft bg-surface-strong">
                  <Image src={src} alt="Existing damage on this vehicle" fill sizes="(max-width: 640px) 45vw, 220px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {showRules && (
        <Section icon={IconRoad} title="Trip rules">
          <Facts
            rows={[
              ["Kilometres", l.dailyKmAllowance ? `${l.dailyKmAllowance.toLocaleString()} km/day${l.excessKmFee ? `, then AU$${l.excessKmFee}/km` : ""}` : "Unlimited"],
              ["Interstate travel", allowed(l.interstateAllowed)],
              ["Unsealed roads", allowed(l.unsealedRoadsAllowed)],
              ["Off-road / 4WD tracks", allowed(l.offRoadAllowed)],
              ["Festivals & events", allowed(l.festivalsAllowed)],
              ["Track days", allowed(l.trackDaysAllowed)],
              ["Pets", allowed(l.petsAllowed)],
              ["Smoking", allowed(l.smokingAllowed)],
              ["Additional drivers", l.additionalDriversAllowed ? `Allowed${l.additionalDriverFee ? ` (AU$${l.additionalDriverFee})` : ""}` : "Not allowed"],
              ["Minimum driver age", l.minimumDriverAge ? `${l.minimumDriverAge} years` : null],
              ["Minimum years licensed", l.minimumLicenceYears || null],
              ["Provisional (P) drivers", allowed(l.provisionalLicenceAllowed)],
              ["International licences", l.internationalLicenceAccepted ? "Accepted" : "Not accepted"],
            ]}
          />
          {l.interstateAllowed && l.interstateNotes && (
            <p className="mt-2 text-body-sm text-muted">{l.interstateNotes}</p>
          )}
        </Section>
      )}

      {showDelivery && (
        <Section icon={IconTruckDelivery} title="Pickup & delivery">
          <Facts
            rows={[
              ["Delivery", l.deliveryAvailable ? `Available${l.deliveryRadiusKm ? ` within ${l.deliveryRadiusKm} km` : ""}${l.deliveryFee ? ` · AU$${l.deliveryFee}` : ""}` : null],
              ["Airport pickup", l.airportPickup ? `Available${l.airportPickupFee ? ` · AU$${l.airportPickupFee}` : ""}` : null],
              ["Handover method", optionLabel("handoverMethod", l.handoverMethod)],
              ["Pickup window", l.pickupWindowStart || l.pickupWindowEnd ? `${l.pickupWindowStart || "?"} – ${l.pickupWindowEnd || "?"}` : null],
              ["Languages spoken", l.languagesSpoken && l.languagesSpoken.length ? l.languagesSpoken.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ") : null],
            ]}
          />
          {l.pickupInstructions && <p className="mt-2 text-body-sm text-muted">{l.pickupInstructions}</p>}
        </Section>
      )}

      {showCosts && (
        <Section icon={IconReceipt2} title="Costs to expect">
          <Facts
            rows={[
              ["Security deposit", l.securityDeposit ? `${money(l.securityDeposit)}${l.depositHoldMethod ? ` · ${optionLabel("depositHoldMethod", l.depositHoldMethod)}` : ""}` : null],
              ["Weekly discount", l.weeklyDiscountPercent ? `${l.weeklyDiscountPercent}%` : null],
              ["Monthly discount", l.monthlyDiscountPercent ? `${l.monthlyDiscountPercent}%` : null],
              ["Late return", l.lateReturnFeePerHour ? `${money(l.lateReturnFeePerHour)}/hour` : null],
              ["Refuelling", l.refuellingFeePerLitre ? `AU$${l.refuellingFeePerLitre}/L` : null],
              ["Tolls", optionLabel("tollHandling", l.tollHandling)],
              ["Fine / infringement admin", money(l.finesAdminFee)],
              ["Roadside assistance", l.roadsideAssistanceIncluded ? `Included${l.roadsideAssistanceProvider ? ` · ${l.roadsideAssistanceProvider}` : ""}` : null],
            ]}
          />
          <p className="mt-3 text-xs leading-5 text-muted">
            The security deposit is a hold, not an upfront charge. These amounts are set by the host and are not part of the estimated total shown in the booking panel.
          </p>
        </Section>
      )}

      {showCategory && specGroup === "UTE" && (
        <Section icon={IconCar4wd} title="Ute & towing">
          <Facts
            rows={[
              ["Payload", l.payloadKg ? `${l.payloadKg.toLocaleString()} kg` : null],
              ["GVM", l.gvmKg ? `${l.gvmKg.toLocaleString()} kg` : null],
              ["Towing (braked)", l.towingCapacityBrakedKg ? `${l.towingCapacityBrakedKg.toLocaleString()} kg` : null],
              ["Towing (unbraked)", l.towingCapacityUnbrakedKg ? `${l.towingCapacityUnbrakedKg.toLocaleString()} kg` : null],
              ["Tray", l.trayLengthMm ? `${l.trayLengthMm}${l.trayWidthMm ? ` × ${l.trayWidthMm}` : ""} mm` : null],
              ["Tow bar", l.towBarFitted ? "Fitted" : null],
              ["Canopy", l.canopyFitted ? "Fitted" : null],
            ]}
          />
        </Section>
      )}

      {showCategory && specGroup === "VAN" && (
        <Section icon={IconLuggage} title="Cargo">
          <Facts
            rows={[
              ["Load volume", l.loadVolumeCubicMetres ? `${l.loadVolumeCubicMetres} m³` : null],
              ["Load length", l.loadLengthMm ? `${l.loadLengthMm} mm` : null],
              ["Internal height", l.internalHeightMm ? `${l.internalHeightMm} mm` : null],
              ["Ply-lined", l.plyLined ? "Yes" : null],
            ]}
          />
        </Section>
      )}

      {showCategory && specGroup === "CAMPER" && (
        <Section icon={IconToolsKitchen3} title="Camp & touring setup">
          <Facts
            rows={[
              ["Sleeping", l.sleepingConfiguration || null],
              ["Main bed", l.bedDimensions || null],
              ["Self-contained", l.selfContained ? `Certified${l.selfContainedCertNumber ? ` (${l.selfContainedCertNumber})` : ""}` : null],
              ["Fresh water", l.freshWaterLitres ? `${l.freshWaterLitres} L` : null],
              ["Grey water", l.greyWaterLitres ? `${l.greyWaterLitres} L` : null],
              ["Gas bottle", l.gasBottleKg ? `${l.gasBottleKg} kg` : null],
              ["Solar", l.solarWatts ? `${l.solarWatts} W` : null],
              ["House battery", l.houseBatteryAmpHours ? `${l.houseBatteryAmpHours} Ah` : null],
              ["Awning", l.awningFitted ? "Fitted" : null],
              ["Shower", optionLabel("showerType", l.showerType)],
              ["Toilet", optionLabel("toiletType", l.toiletType)],
              ["Special licence", l.requiresSpecialLicence ? "Required" : null],
            ]}
          />
          {l.towVehicleRequirements && <p className="mt-2 text-body-sm text-muted">Tow vehicle: {l.towVehicleRequirements}</p>}
        </Section>
      )}
    </>
  );
};

export default ListingDetails;
