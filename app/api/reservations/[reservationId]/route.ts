import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import type { NextRequest } from "next/server";

// ✅ DELETE: Cancel a reservation
export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  // ✅ Extract `reservationId` from URL
  const reservationId = request.nextUrl.pathname.split("/").pop();

  if (!reservationId || typeof reservationId !== "string") {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // ✅ Ensure only the owner or the user who booked can delete
  const reservation = await prisma.reservation.deleteMany({
    where: {
      id: reservationId,
      OR: [{ userId: currentUser.id }, { listing: { userId: currentUser.id } }], // Check ownership
    },
  });

  return NextResponse.json(reservation);
}
