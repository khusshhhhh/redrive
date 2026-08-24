import { paginationQuerySchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileJson, mobileUnexpectedError, mobileValidationError } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { mobileListingSelect, toPublicListing } from "@/app/services/mobileDtos";

async function GETHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = paginationQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return mobileValidationError(request, parsed.error);
  try {
    const user = await prisma.user.findUnique({ where: { id: auth.identity.userId }, select: { favoriteIds: true } });
    const rows = await prisma.listing.findMany({ where: { id: { in: user?.favoriteIds || [] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: parsed.data.limit + 1, ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}), select: mobileListingSelect });
    const hasMore = rows.length > parsed.data.limit;
    const pageRows = hasMore ? rows.slice(0, parsed.data.limit) : rows;
    return mobileJson(request, { data: pageRows.map((listing) => toPublicListing(listing, user?.favoriteIds || [])), page: { hasMore, nextCursor: hasMore ? pageRows.at(-1)?.id || null : null } });
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile favourites failed");
  }
}

export const GET = monitorApiRoute("/api/mobile/v1/favourites", GETHandler, "GET");
