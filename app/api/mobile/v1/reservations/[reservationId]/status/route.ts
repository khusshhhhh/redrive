import { objectIdSchema, reservationStatusRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { executeIdempotent } from "@/app/libs/mobile-api/idempotency";
import { mobileError, mobileUnexpectedError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";
import { writeAuditEvent } from "@/app/libs/security";
import { notificationService } from "@/app/services/notificationService";

type Context = { params: Promise<{ reservationId: string }> };

async function POSTHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { reservationId } = await context.params;
  if (!objectIdSchema.safeParse(reservationId).success) return mobileError(request, 400, "INVALID_RESERVATION_ID", "That reservation identifier is invalid.");
  const parsed = await parseMobileJson(request, reservationStatusRequestSchema);
  if (!parsed.ok) return parsed.response;
  return executeIdempotent({ request, actorUserId: auth.identity.userId, scope: `reservation:${reservationId}:status`, payload: parsed.data, handler: async () => {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { listing: true } });
    if (!reservation || reservation.listing.userId !== auth.identity.userId) return { status: 404, body: { error: { code: "RESERVATION_NOT_FOUND", message: "That reservation was not found.", requestId: "idempotent" } } };
    if (reservation.status !== "REVIEWING") return { status: 409, body: { error: { code: "STATUS_TRANSITION_INVALID", message: `A ${reservation.status} reservation cannot be changed to ${parsed.data.status}.`, requestId: "idempotent" } } };
    if (parsed.data.status === "APPROVED") {
      const owner = await prisma.user.findUnique({ where: { id: auth.identity.userId }, select: { stripeConnectedAccountId: true, stripePayoutsEnabled: true } });
      let payoutsEnabled = Boolean(owner?.stripePayoutsEnabled);
      if (owner?.stripeConnectedAccountId) {
        try {
          const account = await getStripe().accounts.retrieve(owner.stripeConnectedAccountId);
          payoutsEnabled = account.payouts_enabled && account.capabilities?.transfers === "active";
          await prisma.user.update({ where: { id: auth.identity.userId }, data: { stripeDetailsSubmitted: account.details_submitted, stripePayoutsEnabled: payoutsEnabled } });
        } catch {
          return { status: 503, body: { error: { code: "PAYOUT_STATUS_UNAVAILABLE", message: "Payout setup could not be verified. Try again shortly.", requestId: "idempotent" } } };
        }
      }
      if (!payoutsEnabled) return { status: 409, body: { error: { code: "PAYOUT_SETUP_REQUIRED", message: "Set up and verify payouts before approving bookings.", requestId: "idempotent" } } };
    }
    const updated = await prisma.reservation.update({ where: { id: reservation.id }, data: { status: parsed.data.status, respondedAt: new Date(), ...(parsed.data.status === "APPROVED" ? { paymentDueAt: new Date(Date.now() + 24 * 60 * 60_000) } : {}) } });
    await writeAuditEvent({ request, actorUserId: auth.identity.userId, action: "RESERVATION_STATUS_CHANGED", targetType: "Reservation", targetId: reservation.id, metadata: { from: reservation.status, to: parsed.data.status } });
    if (parsed.data.status === "APPROVED") {
      await notificationService.notifyBookingApproved(reservation.userId, reservation.listing.title, reservation.id).catch(() => undefined);
      await notificationService.notifyPaymentRequired(reservation.userId, reservation.totalFees, reservation.listing.title, reservation.id).catch(() => undefined);
    } else await notificationService.notifyBookingDeclined(reservation.userId, reservation.listing.title, reservation.id).catch(() => undefined);
    return { status: 200, body: { id: updated.id, status: updated.status, respondedAt: updated.respondedAt?.toISOString() || null, paymentDueAt: updated.paymentDueAt?.toISOString() || null } };
  } }).catch((error) => mobileUnexpectedError(request, error, "Mobile reservation status failed"));
}

export const POST = monitorApiRoute("/api/mobile/v1/reservations/[reservationId]/status", POSTHandler, "POST");
