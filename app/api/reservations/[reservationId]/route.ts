import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import type { NextRequest } from "next/server";
import { notificationService } from "@/app/services/notificationService";

// ✅ GET: Fetch reservation details with user included
export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any // Override type checking for params
) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reservationId } = await context.params;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Invalid reservation ID" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { listing: true, user: true }, // ✅ Include user details
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    if (reservation.userId !== currentUser.id && reservation.listing.userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Ensure response matches SafeReservation format
    const safeReservation = {
      ...reservation,
      createdAt: reservation.createdAt.toISOString(),
      startDate: reservation.startDate.toISOString(),
      endDate: reservation.endDate.toISOString(),
      user: {
        id: reservation.user.id,
        name: reservation.user.name,
        email: reservation.user.email,
        number: reservation.user.number,
        image: reservation.user.image,
        profileVerified: reservation.user.profileVerified,
        createdAt: reservation.user.createdAt.toISOString(),
        updatedAt: reservation.user.updatedAt.toISOString(),
        emailVerified: reservation.user.emailVerified
          ? reservation.user.emailVerified.toISOString()
          : null,
        lastActiveAt: reservation.user.lastActiveAt
          ? reservation.user.lastActiveAt.toISOString()
          : null,
      },
      listing: {
        ...reservation.listing,
        createdAt: reservation.listing.createdAt.toISOString(),
      },
    };

    return NextResponse.json(safeReservation, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
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
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reservationId } = await context.params;

    // Validate the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { 
        listing: true,
        user: true 
      },
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

    // Check cancellation window: allow up to 2 days before start date
    const today = new Date();
    const twoDaysBefore = new Date(reservation.startDate);
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);

    if (today > twoDaysBefore) {
      return NextResponse.json(
        { error: "Too late to cancel this reservation" },
        { status: 400 }
      );
    }

    // Determine who cancelled and notify the other party
    const cancelledBy = currentUser.id === reservation.userId ? "you" : reservation.listing.title + " owner";
    const notifyUserId = currentUser.id === reservation.userId ? reservation.listing.userId : reservation.userId;

    await prisma.reservation.delete({
      where: { id: reservationId },
    });

    // Send cancellation notification
    try {
      await notificationService.notifyBookingCancelled(
        notifyUserId,
        reservation.listing.title,
        reservation.id,
        cancelledBy
      );
    } catch (notificationError) {
      console.error("Error sending cancellation notification:", notificationError);
      // Don't fail the cancellation if notification fails
    }

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

// PATCH: update reservation status
export async function PATCH(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reservationId } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!reservationId || !status) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { 
        listing: true,
        user: true 
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.listing.userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status },
    });

    // Send notification based on status change
    try {
      if (status === "APPROVED") {
        await notificationService.notifyBookingApproved(
          reservation.userId,
          reservation.listing.title,
          reservation.id
        );
      } else if (status === "DECLINED") {
        await notificationService.notifyBookingDeclined(
          reservation.userId,
          reservation.listing.title,
          reservation.id
        );
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
      // Don't fail the reservation update if notification fails
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
