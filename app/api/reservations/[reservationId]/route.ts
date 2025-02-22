import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import type { NextRequest } from "next/server";

// ✅ GET: Fetch reservation details
export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any // Override type checking for params
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reservationId = context.params?.reservationId;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { listing: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation, { status: 200 });
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ DELETE: Cancel a reservation
export async function DELETE(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any // Override type checking for params
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reservationId = context.params?.reservationId;

    // Validate the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { listing: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Ensure the user is either the one who booked or the listing owner
    if (
      reservation.userId !== currentUser.id &&
      reservation.listing.userId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: "Unauthorized to cancel this reservation" },
        { status: 403 }
      );
    }

    // Delete the reservation
    await prisma.reservation.delete({
      where: { id: reservationId },
    });

    return NextResponse.json(
      { success: true, message: "Reservation canceled" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error canceling reservation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
