import { listingsQuerySchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { optionalIdentity } from "@/app/libs/mobile-auth/identity";
import { mobileJson, mobileUnexpectedError, mobileValidationError } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { mobileListingSelect, toPublicListing } from "@/app/services/mobileDtos";

async function GETHandler(request: Request) {
  const url = new URL(request.url);
  const query = Object.fromEntries([...url.searchParams.entries()].filter(([, value]) => value !== ""));
  const parsed = listingsQuerySchema.safeParse(query);
  if (!parsed.success) return mobileValidationError(request, parsed.error);
  const { cursor, limit, state, suburb, category, minPriceCents, maxPriceCents, guestCount, transmission, delivery, petsAllowed, unsealed } = parsed.data;
  try {
    const identity = await optionalIdentity(request);
    const and: Record<string, unknown>[] = [];
    if (delivery) and.push({ OR: [{ deliveryAvailable: true }, { airportPickup: true }] });
    if (unsealed) and.push({ OR: [{ unsealedRoadsAllowed: true }, { offRoadAllowed: true }] });
    const [rows, user] = await Promise.all([
      prisma.listing.findMany({
        where: {
          ...(state ? { state } : {}),
          ...(suburb ? { suburb: { equals: suburb, mode: "insensitive" } } : {}),
          ...(category ? { category } : {}),
          ...(guestCount ? { guestCount: { gte: guestCount } } : {}),
          ...(transmission ? { transmission } : {}),
          ...(petsAllowed ? { petsAllowed: true } : {}),
          ...(and.length ? { AND: and } : {}),
          ...(minPriceCents !== undefined || maxPriceCents !== undefined ? { price: { ...(minPriceCents !== undefined ? { gte: Math.ceil(minPriceCents / 100) } : {}), ...(maxPriceCents !== undefined ? { lte: Math.floor(maxPriceCents / 100) } : {}) } } : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: mobileListingSelect,
      }),
      identity ? prisma.user.findUnique({ where: { id: identity.userId }, select: { favoriteIds: true } }) : null,
    ]);
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    return mobileJson(request, { data: pageRows.map((listing) => toPublicListing(listing, user?.favoriteIds || [])), page: { hasMore, nextCursor: hasMore ? pageRows.at(-1)?.id || null : null } }, 200, { "Cache-Control": identity ? "private, no-store" : "public, max-age=30" });
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile listing discovery failed");
  }
}

export const GET = monitorApiRoute("/api/mobile/v1/listings", GETHandler, "GET");
