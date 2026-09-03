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

const CONTACT_VISIBLE_STATUSES = ["APPROVED", "ACTIVE", "COMPLETED"];

export interface ContactRevealInput {
  reservationStatus: string;
  paymentStatus?: string | null;
}

/**
 * Whether the two parties to a booking may see each other's email address and
 * phone number. Until a request is approved (or paid) the parties talk through
 * Messages only: a REVIEWING request shouldn't hand a stranger the host's
 * personal email and phone, and a host decides on a request from the guest's
 * profile, ratings and message — not their number. Once the booking is
 * confirmed the two sides need to reach each other directly for the handover.
 * Applied symmetrically to both host and guest.
 */
export function mayRevealContactDetails(input: ContactRevealInput): boolean {
  if (CONTACT_VISIBLE_STATUSES.includes(input.reservationStatus)) return true;
  if (input.paymentStatus && PAID_STATUSES.includes(input.paymentStatus)) return true;
  return false;
}
