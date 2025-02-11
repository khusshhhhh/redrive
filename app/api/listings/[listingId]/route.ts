import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import type { NextRequest } from "next/server";

// ✅ DELETE: Remove a listing
export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  // ✅ Extract `listingId` from URL
  const listingId = request.nextUrl.pathname.split("/").pop();

  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // ✅ Ensure only the listing owner can delete
  const listing = await prisma.listing.deleteMany({
    where: {
      id: listingId,
      userId: currentUser.id, // Ensure ownership
    },
  });

  return NextResponse.json(listing);
}
