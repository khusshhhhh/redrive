import { objectIdSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileError, mobileJson, mobileUnexpectedError } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { toMobileReservation } from "@/app/services/mobileDtos";

type Context = { params: Promise<{ reservationId: string }> };

async function GETHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { reservationId } = await context.params;
  if (!objectIdSchema.safeParse(reservationId).success) return mobileError(request, 400, "INVALID_RESERVATION_ID", "That reservation identifier is invalid.");
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { listing: true, user: { select: { id: true, name: true, image: true } }, payment: { select: { status: true, amount: true, paidAt: true, refundedAt: true } } } });
    if (!reservation || (reservation.userId !== auth.identity.userId && reservation.listing.userId !== auth.identity.userId)) return mobileError(request, 404, "RESERVATION_NOT_FOUND", "That reservation was not found.");
    return mobileJson(request, { ...toMobileReservation(reservation, auth.identity.userId), payment: reservation.payment ? { status: reservation.payment.status, amountCents: reservation.payment.amount, paidAt: reservation.payment.paidAt?.toISOString() || null, refundedAt: reservation.payment.refundedAt?.toISOString() || null } : null });
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile reservation detail failed");
  }
}

export const GET = monitorApiRoute("/api/mobile/v1/reservations/[reservationId]", GETHandler, "GET");
