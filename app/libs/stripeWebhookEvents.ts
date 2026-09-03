import { Prisma } from "@prisma/client";
import prisma from "@/app/libs/prismadb";

// Exactly-once processing for Stripe webhook deliveries.
//
// Stripe retries failed deliveries and can also deliver the same event to
// several instances at once. We claim the event by inserting its id (unique
// index) *before* doing any work: a concurrent delivery that loses the race
// sees "duplicate" and acks without re-processing. If processing then throws,
// `releaseStripeEvent` removes the claim so Stripe's next retry can pick it up.

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/**
 * Try to claim an event for processing.
 * - `"fresh"`  → this call owns it; do the work, then leave the row in place.
 * - `"duplicate"` → already claimed/processed elsewhere; ack and stop.
 */
export async function claimStripeEvent(
  stripeEventId: string,
  type: string,
): Promise<"fresh" | "duplicate"> {
  try {
    await prisma.stripeWebhookEvent.create({ data: { stripeEventId, type } });
    return "fresh";
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }
}

/** Undo a claim so a failed delivery is retried rather than lost. */
export async function releaseStripeEvent(stripeEventId: string): Promise<void> {
  await prisma.stripeWebhookEvent
    .deleteMany({ where: { stripeEventId } })
    .catch((error) => console.error("Failed to release Stripe event claim", stripeEventId, error));
}
