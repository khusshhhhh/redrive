import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import type { NextRequest } from "next/server";
import { notificationService } from "@/app/services/notificationService";

// ✅ POST: Add listing to favorites
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.error();
  }

  const listingId = request.nextUrl.pathname.split("/").pop(); // ✅ Extract listingId from URL
  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const favoriteIds = [...(currentUser.favoriteIds || [])];
  favoriteIds.push(listingId);

  const user = await prisma.user.update({
    where: { id: currentUser.id },
    data: { favoriteIds },
  });

  // Get listing details for the notification
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

// ✅ DELETE: Remove listing from favorites
export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.error();
  }

  const listingId = request.nextUrl.pathname.split("/").pop(); // ✅ Extract listingId from URL
  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  let favoriteIds = [...(currentUser.favoriteIds || [])];
  favoriteIds = favoriteIds.filter((id) => id !== listingId);

  const user = await prisma.user.update({
    where: { id: currentUser.id },
    data: { favoriteIds },
  });

  return NextResponse.json(user);
}
