import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import type { NextRequest } from "next/server";
import { notificationService } from "@/app/services/notificationService";

async function POSTHandler(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.error();
  }

  const listingId = request.nextUrl.pathname.split("/").pop();
  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const favoriteIds = [...new Set([...(currentUser.favoriteIds || []), listingId])];

  const [user] = await Promise.all([
    prisma.user.update({ where: { id: currentUser.id }, data: { favoriteIds } }),
    // Dual-write the join row (carries createdAt + a listing index).
    prisma.favourite
      .upsert({
        where: { userId_listingId: { userId: currentUser.id, listingId } },
        create: { userId: currentUser.id, listingId },
        update: {},
      })
      .catch((error) => console.error("Favourite row upsert failed", error)),
  ]);

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (listing && listing.userId !== currentUser.id) {
      // Send favorite notification to listing owner (don't notify if user favorites their own listing)
      await notificationService.notifyListingFavorited(
        listing.userId,
        currentUser.name || "Someone",
        listing.title,
        listingId
      );
    }
  } catch (notificationError) {
    console.error("Error sending favorite notification:", notificationError);
    // Don't fail the favorite action if notification fails
  }

  return NextResponse.json(user);
}

async function DELETEHandler(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.error();
  }

  const listingId = request.nextUrl.pathname.split("/").pop();
  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const favoriteIds = (currentUser.favoriteIds || []).filter((id) => id !== listingId);

  const [user] = await Promise.all([
    prisma.user.update({ where: { id: currentUser.id }, data: { favoriteIds } }),
    prisma.favourite
      .deleteMany({ where: { userId: currentUser.id, listingId } })
      .catch((error) => console.error("Favourite row delete failed", error)),
  ]);

  return NextResponse.json(user);
}

export const POST = monitorApiRoute("/api/favorites/[listingId]", POSTHandler, "POST");

export const DELETE = monitorApiRoute("/api/favorites/[listingId]", DELETEHandler, "DELETE");
