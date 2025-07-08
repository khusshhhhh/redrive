import { NextResponse } from "next/server";
import { MigrationHelper } from "@/app/libs/migration-helper";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      listingId,
      startDate,
      endDate,
      totalPrice,
      redriveFee = 0,
      serviceFee = 0,
      insuranceType,
      insuranceFee = 0,
      totalFees = 0,
    } = body;

    // Validate required fields
    if (!listingId || !startDate || !endDate || !totalPrice || !insuranceType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse dates
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    // Validate date range
    if (parsedStartDate >= parsedEndDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Prepare reservation data
    const reservationData = {
      userId: currentUser.id,
      listingId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      totalPrice: parseInt(totalPrice, 10),
      redriveFee: parseInt(redriveFee, 10),
      serviceFee: parseInt(serviceFee, 10),
      insuranceType,
      insuranceFee: parseInt(insuranceFee, 10),
      totalFees: parseInt(totalFees, 10),
      status: "REVIEWING",
      createdAt: new Date(),
    };

    // Use migration helper for backwards compatibility
    const reservation = await MigrationHelper.createReservation(reservationData);

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("❌ Reservation creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create reservation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Update reservation status
export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reservationId, status, ...updateData } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['REVIEWING', 'APPROVED', 'DECLINED'].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const updatePayload = {
      ...updateData,
      ...(status && { status }),
      updatedAt: new Date(),
    };

    // Use migration helper for backwards compatibility
    const reservation = await MigrationHelper.updateReservation(reservationId, updatePayload);

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("❌ Reservation update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update reservation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}