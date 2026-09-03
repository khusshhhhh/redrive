import { NextResponse } from "next/server";
import { quoteRequestSchema } from "@redrive/contracts";

import prisma from "@/app/libs/prismadb";
import { defineApiRoute } from "@/app/libs/defineApiRoute";
import { buildBookingQuote } from "@/app/libs/booking";
import { cancellationPolicySnapshot } from "@/app/libs/cancellationPolicy";

// Exemplar of the `defineApiRoute` wrapper (#22): monitoring, auth and the
// shared zod contract schema (#21) are declared, not re-implemented. The
// handler receives a validated `body` and a request-scoped `log`.
export const POST = defineApiRoute(
  {
    path: "/api/reservations/quote",
    method: "POST",
    auth: true,
    body: quoteRequestSchema,
    rateLimit: ({ user, ip }) => [
      { scope: "quote-user", identifier: user?.id ?? ip, limit: 60, windowMs: 60_000 },
      { scope: "quote-ip", identifier: ip, limit: 120, windowMs: 60_000 },
    ],
  },
  async ({ body }) => {
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (endDate < startDate) {
      return NextResponse.json({ error: "End date is before the start date" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: body.listingId },
      select: { price: true, cleaningFeeOption: true, cleaningFeeAmount: true, cancellationPolicy: true },
    });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const quote = buildBookingQuote({
      dailyRate: listing.price,
      startDate,
      endDate,
      insuranceType: body.insuranceType,
      cleaningFee: listing.cleaningFeeOption === "YES" ? listing.cleaningFeeAmount || 0 : 0,
    });

    return NextResponse.json(
      {
        ...quote,
        cancellationPolicy: cancellationPolicySnapshot(listing.cancellationPolicy),
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
);
