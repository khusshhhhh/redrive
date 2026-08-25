import { objectIdSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileError, mobileJson, mobileUnexpectedError } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { notificationService } from "@/app/services/notificationService";

type Context = { params: Promise<{ listingId: string }> };

async function POSTHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { listingId } = await context.params;
  if (!objectIdSchema.safeParse(listingId).success) return mobileError(request, 400, "INVALID_LISTING_ID", "That listing identifier is invalid.");
  try {
    const [listing, user] = await Promise.all([
      prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, title: true, userId: true } }),
      prisma.user.findUnique({ where: { id: auth.identity.userId }, select: { favoriteIds: true, name: true } }),
    ]);
    if (!listing) return mobileError(request, 404, "LISTING_NOT_FOUND", "That listing is no longer available.");
    if (!user) return mobileError(request, 404, "USER_NOT_FOUND", "The account no longer exists.");
    const alreadyFavourite = user.favoriteIds.includes(listingId);
    if (!alreadyFavourite) {
      await prisma.user.update({ where: { id: auth.identity.userId }, data: { favoriteIds: { set: [...user.favoriteIds, listingId] } } });
      if (listing.userId !== auth.identity.userId) await notificationService.notifyListingFavorited(listing.userId, user.name || "Someone", listing.title, listing.id).catch((error) => console.error("Favourite notification failed", error));
    }
    return mobileJson(request, { listingId, favourite: true, changed: !alreadyFavourite });
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile favourite add failed");
  }
}

async function DELETEHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { listingId } = await context.params;
  if (!objectIdSchema.safeParse(listingId).success) return mobileError(request, 400, "INVALID_LISTING_ID", "That listing identifier is invalid.");
  try {
    const user = await prisma.user.findUnique({ where: { id: auth.identity.userId }, select: { favoriteIds: true } });
    if (!user) return mobileError(request, 404, "USER_NOT_FOUND", "The account no longer exists.");
    const next = user.favoriteIds.filter((id) => id !== listingId);
    if (next.length !== user.favoriteIds.length) await prisma.user.update({ where: { id: auth.identity.userId }, data: { favoriteIds: { set: next } } });
    return mobileJson(request, { listingId, favourite: false, changed: next.length !== user.favoriteIds.length });
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile favourite remove failed");
  }
}

export const POST = monitorApiRoute("/api/mobile/v1/favourites/[listingId]", POSTHandler, "POST");
export const DELETE = monitorApiRoute("/api/mobile/v1/favourites/[listingId]", DELETEHandler, "DELETE");
