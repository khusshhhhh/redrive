import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (
    !expected ||
    request.headers.get("authorization") !== `Bearer ${expected}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const expired = await prisma.reservation.findMany({
    where: {
      status: "APPROVED",
      paymentDueAt: { lte: new Date() },
      paymentStatus: { notIn: ["PAID_HELD", "RELEASED"] },
    },
    select: {
      id: true,
      payment: { select: { stripeCheckoutSessionId: true, status: true } },
    },
    take: 100,
  });
  let expiredCount = 0;
  for (const reservation of expired) {
    if (
      reservation.payment?.stripeCheckoutSessionId &&
      reservation.payment.status === "CHECKOUT_PENDING"
    ) {
      try {
        const session = await getStripe().checkout.sessions.retrieve(
          reservation.payment.stripeCheckoutSessionId,
        );
        if (session.payment_status === "paid") continue;
        if (session.status === "open")
          await getStripe().checkout.sessions.expire(session.id);
      } catch (error) {
        console.error(
          "Could not verify an overdue Checkout Session",
          reservation.id,
          error,
        );
        continue;
      }
    }
    await prisma.$transaction([
      prisma.reservation.updateMany({
        where: {
          id: reservation.id,
          paymentStatus: { notIn: ["PAID_HELD", "RELEASED"] },
        },
        data: { status: "EXPIRED", paymentStatus: "PAYMENT_EXPIRED" },
      }),
      prisma.payment.updateMany({
        where: { reservationId: reservation.id, status: "CHECKOUT_PENDING" },
        data: { status: "CHECKOUT_EXPIRED" },
      }),
    ]);
    expiredCount += 1;
  }
  return NextResponse.json({ checked: expired.length, expired: expiredCount });
}
