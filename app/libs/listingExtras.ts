import type { Prisma } from "@prisma/client";

/**
 * Coerces the extended vehicle-listing fields from a raw request body into a
 * Prisma-ready partial. Shared by the create (POST /api/listings) and update
 * (PUT /api/listings/[listingId]) routes so both stay in sync.
 *
 * A field that is absent from the body is left out of the result entirely — on
 * create Prisma then applies the schema default, on update the column is left
 * unchanged. A field that is present but blank becomes null (or false / []).
 */

const INT_FIELDS = [
  "odometer",
  "seatbeltCount",
  "keysProvided",
  "fuelTankLitres",
  "drivingRangeKm",
  "groundClearanceMm",
  "isofixPoints",
  "childSeatsAvailable",
  "luggageLargeBags",
  "luggageCabinBags",
  "lastServiceOdometer",
  "ancapRating",
  "dailyKmAllowance",
  "additionalDriverFee",
  "minimumDriverAge",
  "minimumLicenceYears",
  "deliveryRadiusKm",
  "deliveryFee",
  "airportPickupFee",
  "securityDeposit",
  "weeklyDiscountPercent",
  "monthlyDiscountPercent",
  "lateReturnFeePerHour",
  "finesAdminFee",
  "payloadKg",
  "gvmKg",
  "towingCapacityBrakedKg",
  "towingCapacityUnbrakedKg",
  "trayLengthMm",
  "trayWidthMm",
  "loadLengthMm",
  "internalHeightMm",
  "freshWaterLitres",
  "greyWaterLitres",
  "solarWatts",
  "houseBatteryAmpHours",
] as const;

const FLOAT_FIELDS = [
  "vehicleHeightMeters",
  "vehicleLengthMeters",
  "batteryCapacityKwh",
  "maxChargingKw",
  "excessKmFee",
  "refuellingFeePerLitre",
  "loadVolumeCubicMetres",
  "gasBottleKg",
] as const;

const STRING_FIELDS = [
  "transmission",
  "colour",
  "chargePortType",
  "tyreCondition",
  "modifications",
  "damageNotes",
  "interstateNotes",
  "handoverMethod",
  "pickupInstructions",
  "pickupWindowStart",
  "pickupWindowEnd",
  "depositHoldMethod",
  "tollHandling",
  "roadsideAssistanceProvider",
  "sleepingConfiguration",
  "bedDimensions",
  "selfContainedCertNumber",
  "showerType",
  "toiletType",
  "towVehicleRequirements",
] as const;

const BOOL_FIELDS = [
  "hasTollTag",
  "portableChargerIncluded",
  "spareTyre",
  "hasDashcam",
  "hasGpsTracker",
  "firstAidKit",
  "fireExtinguisher",
  "smokeFree",
  "petFree",
  "interstateAllowed",
  "unsealedRoadsAllowed",
  "offRoadAllowed",
  "petsAllowed",
  "smokingAllowed",
  "festivalsAllowed",
  "trackDaysAllowed",
  "additionalDriversAllowed",
  "provisionalLicenceAllowed",
  "internationalLicenceAccepted",
  "deliveryAvailable",
  "airportPickup",
  "roadsideAssistanceIncluded",
  "towBarFitted",
  "canopyFitted",
  "plyLined",
  "selfContained",
  "awningFitted",
  "requiresSpecialLicence",
] as const;

const STRING_ARRAY_FIELDS = ["damagePhotos", "safetyFeatures", "languagesSpoken"] as const;

/** Every extended field name — exported for tests and to keep DTO selects / forms in sync. */
export const LISTING_EXTRA_FIELDS = [
  ...INT_FIELDS,
  ...FLOAT_FIELDS,
  ...STRING_FIELDS,
  ...BOOL_FIELDS,
  ...STRING_ARRAY_FIELDS,
  "lastServicedAt",
] as const;

export const LISTING_EXTRA_BOOL_FIELDS = BOOL_FIELDS;
export const LISTING_EXTRA_ARRAY_FIELDS = STRING_ARRAY_FIELDS;

// Fields whose numeric value is clamped to a sensible inclusive range.
const CLAMP: Record<string, [number, number]> = {
  ancapRating: [1, 5],
  weeklyDiscountPercent: [0, 90],
  monthlyDiscountPercent: [0, 90],
  minimumDriverAge: [16, 99],
  minimumLicenceYears: [0, 50],
};

type Body = Record<string, unknown>;

const present = (body: Body, key: string) =>
  Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;

function toInt(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFloat(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1" || value === "on";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0))];
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function clamp(field: string, value: number | null): number | null {
  if (value === null) return null;
  const range = CLAMP[field];
  if (!range) return value;
  return Math.min(range[1], Math.max(range[0], value));
}

export type ListingExtras = Partial<
  Pick<Prisma.ListingUncheckedCreateInput, (typeof LISTING_EXTRA_FIELDS)[number]>
>;

export function sanitizeListingExtras(body: Body): ListingExtras {
  const out: Record<string, unknown> = {};

  for (const field of INT_FIELDS) {
    if (present(body, field)) out[field] = clamp(field, toInt(body[field]));
  }
  for (const field of FLOAT_FIELDS) {
    if (present(body, field)) out[field] = clamp(field, toFloat(body[field]));
  }
  for (const field of STRING_FIELDS) {
    if (present(body, field)) out[field] = toStringOrNull(body[field]);
  }
  for (const field of BOOL_FIELDS) {
    if (present(body, field)) out[field] = toBool(body[field]);
  }
  for (const field of STRING_ARRAY_FIELDS) {
    if (present(body, field)) out[field] = toStringArray(body[field]);
  }
  if (present(body, "lastServicedAt")) {
    out.lastServicedAt = toDate(body.lastServicedAt);
  }

  return out as ListingExtras;
}
