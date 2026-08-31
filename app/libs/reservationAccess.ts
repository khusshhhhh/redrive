const PAID_STATUSES = ["PAID_HELD", "RELEASED"];
const TRIP_LIVE_STATUSES = ["ACTIVE", "COMPLETED"];

export interface LocationRevealInput {
  isOwner: boolean;
  reservationStatus: string;
  paymentStatus: string | null | undefined;
  /** Listing.exactLocationReleaseRule — "PAID_BOOKING" (default) or "APPROVED_BOOKING". */
  releaseRule?: string | null;
}

/**
 * Whether a guest may see the vehicle's exact address / coordinates for a
 * booking. The host always can. Otherwise the pickup address stays hidden
 * (suburb-level only) until the booking is paid for — a host can opt into an
 * earlier reveal at approval by setting the listing's release rule to
 * "APPROVED_BOOKING".
 */
export function mayRevealExactLocation(input: LocationRevealInput): boolean {
  if (input.isOwner) return true;
  if (TRIP_LIVE_STATUSES.includes(input.reservationStatus)) return true;
  if (input.paymentStatus && PAID_STATUSES.includes(input.paymentStatus)) return true;
  if (
    (input.releaseRule ?? "PAID_BOOKING") === "APPROVED_BOOKING" &&
    input.reservationStatus === "APPROVED"
  ) {
    return true;
  }
  return false;
}
