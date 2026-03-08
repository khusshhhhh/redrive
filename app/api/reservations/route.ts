import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import type { NextRequest } from "next/server";
import { notificationService } from "@/app/services/notificationService";

// ✅ Function to determine service fee based on total price
const calculateServiceFee = (totalPrice: number): number => {
  if (totalPrice <= 200) return 10;
  if (totalPrice <= 400) return 25;
  if (totalPrice <= 800) return 40;
  if (totalPrice <= 1200) return 60;
  if (totalPrice <= 2000) return 80;
  return 100;
};

// ✅ POST: Create a reservation
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      listingId,
      startDate,
      endDate,
      totalPrice,
      insuranceType,
      insuranceFee,
    } = body;

    if (!listingId || !startDate || !endDate || !totalPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Fetch listing to ensure it exists and check ownership
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // ✅ Prevent users from booking their own listings
    if (listing.userId === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot book your own listing" },
        { status: 403 }
      );
    }

    // Ensure `insuranceType` and `insuranceFee` are properly handled
    const finalInsuranceType = insuranceType || "No Insurance"; // Default if not provided
    const finalInsuranceFee = insuranceFee || 0;


    const redriveFee = Math.round(totalPrice * 0.08);
    const serviceFee = calculateServiceFee(totalPrice);
    const totalFees = totalPrice + redriveFee + serviceFee + finalInsuranceFee;

    const reservation = await prisma.reservation.create({
      data: {
        userId: currentUser.id,
        listingId,
        startDate,
        endDate,
        totalPrice,
        redriveFee,
        serviceFee,
        insuranceType: finalInsuranceType,
        insuranceFee: finalInsuranceFee,
        totalFees,
        status: "REVIEWING",
      },
    });

    // Send booking request notification to listing owner
    try {
      await notificationService.notifyBookingRequest(
        listing.userId,
        currentUser.name || "Someone",
        listing.title,
        reservation.id
      );
    } catch (notificationError) {
      console.error("Error sending booking request notification:", notificationError);
      // Don't fail the reservation creation if notification fails
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reservations = await prisma.reservation.findMany({
      include: {
        user: true, // ✅ Ensure user is included
        listing: true, // ✅ Ensure listing is included
      },
    });

    // ✅ Convert all Date fields to ISO strings for TypeScript compatibility
    const safeReservations = reservations.map((reservation) => ({
      ...reservation,
      createdAt: reservation.createdAt.toISOString(),
      startDate: reservation.startDate.toISOString(),
      endDate: reservation.endDate.toISOString(),
      user: {
        ...reservation.user,
        createdAt: reservation.user.createdAt.toISOString(),
        updatedAt: reservation.user.updatedAt.toISOString(),
        emailVerified: reservation.user.emailVerified
          ? reservation.user.emailVerified.toISOString()
          : null,
      },
      listing: {
        ...reservation.listing,
        createdAt: reservation.listing.createdAt.toISOString(),
        regoImage: reservation.listing.regoImage ?? "", // ✅ Ensure regoImage is always a string
      },
    }));

    return NextResponse.json(safeReservations, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}
