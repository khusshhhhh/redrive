import { objectIdSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { optionalIdentity } from "@/app/libs/mobile-auth/identity";
import { mobileError, mobileJson, mobileUnexpectedError } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { mobileListingSelect, toPublicListing } from "@/app/services/mobileDtos";

type Context = { params: Promise<{ listingId: string }> };

async function GETHandler(request: Request, context: Context) {
  const { listingId } = await context.params;
  if (!objectIdSchema.safeParse(listingId).success) return mobileError(request, 400, "INVALID_LISTING_ID", "That listing identifier is invalid.");
  try {
    const identity = await optionalIdentity(request);
    const [listing, user, reviews] = await Promise.all([
      prisma.listing.findUnique({ where: { id: listingId }, select: { ...mobileListingSelect, information: true, minimumNoticeHours: true, minimumTripDays: true, maximumTripDays: true, cancellationPolicy: true, user: { select: { id: true, name: true, image: true, profileVerified: true, createdAt: true } } } }),
      identity ? prisma.user.findUnique({ where: { id: identity.userId }, select: { favoriteIds: true } }) : null,
      prisma.review.findMany({ where: { listingId }, select: { rating: true }, take: 500 }),
    ]);
    if (!listing) return mobileError(request, 404, "LISTING_NOT_FOUND", "That listing is no longer available.");
    const ratingTotal = reviews.reduce((sum, review) => sum + review.rating, 0);
    return mobileJson(request, {
      ...toPublicListing(listing, user?.favoriteIds || []),
      information: listing.information,
      bookingRules: { minimumNoticeHours: listing.minimumNoticeHours, minimumTripDays: listing.minimumTripDays, maximumTripDays: listing.maximumTripDays, cancellationPolicy: listing.cancellationPolicy || "MODERATE" },
      owner: { id: listing.user.id, name: listing.user.name || "", image: listing.user.image || null, verified: listing.user.profileVerified === "Y", memberSince: listing.user.createdAt.toISOString() },
      reviewSummary: { count: reviews.length, average: reviews.length ? Math.round((ratingTotal / reviews.length) * 10) / 10 : null },
    }, 200, { "Cache-Control": identity ? "private, no-store" : "public, max-age=30" });
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile listing detail failed");
  }
}

export const GET = monitorApiRoute("/api/mobile/v1/listings/[listingId]", GETHandler, "GET");
