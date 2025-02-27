import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId, rating, text } = await request.json();

    // Validate input
    if (!listingId || !rating || !text || text.split(" ").length > 100) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Get the current date and subtract one day
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Check if user has completed a reservation for this listing at least 1 day ago
    const completedBooking = await prisma.reservation.findFirst({
      where: {
        userId: currentUser.id,
        listingId: listingId,
        endDate: { lte: oneDayAgo }, // Ensures the review can be left only after one day
      },
    });

    if (!completedBooking) {
      return NextResponse.json(
        { error: "You can only review after one day of trip completion" },
        { status: 403 }
      );
    }

    // Ensure the user hasn't already reviewed
    const existingReview = await prisma.review.findUnique({
      where: { userId_listingId: { userId: currentUser.id, listingId } },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this listing" },
        { status: 403 }
      );
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        userId: currentUser.id,
        listingId,
        rating,
        text,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
