import { quoteRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { buildBookingQuote } from "@/app/libs/booking";
import { cancellationPolicySnapshot } from "@/app/libs/cancellationPolicy";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileError, mobileJson, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";

async function POSTHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, quoteRequestSchema);
  if (!parsed.ok) return parsed.response;
  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate < startDate) return mobileError(request, 400, "INVALID_DATE_RANGE", "The return date must not be before pickup.", { endDate: "Choose a date on or after pickup." });
  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId }, select: { price: true, cleaningFeeOption: true, cleaningFeeAmount: true, cancellationPolicy: true } });
  if (!listing) return mobileError(request, 404, "LISTING_NOT_FOUND", "That listing is no longer available.");
  const quote = buildBookingQuote({ dailyRate: listing.price, startDate, endDate, insuranceType: parsed.data.insuranceType, cleaningFee: listing.cleaningFeeOption === "YES" ? listing.cleaningFeeAmount || 0 : 0 });
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  return mobileJson(request, { days: quote.days, dailyRateCents: quote.dailyRate * 100, basePriceCents: quote.basePrice * 100, redriveFeeCents: quote.redriveFee * 100, serviceFeeCents: quote.serviceFee * 100, insuranceType: quote.insuranceType, insuranceFeeCents: quote.insuranceFee * 100, cleaningFeeCents: quote.cleaningFee * 100, totalCents: quote.total * 100, currency: quote.currency, policyVersion: quote.policyVersion, cancellationPolicy: cancellationPolicySnapshot(listing.cancellationPolicy), expiresAt });
}

export const POST = monitorApiRoute("/api/mobile/v1/reservations/quote", POSTHandler, "POST");
