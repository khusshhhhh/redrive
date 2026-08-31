import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { notificationService } from "@/app/services/notificationService";
import { maybePublishTripReviews } from "@/app/libs/reviews";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await consumeRateLimits([
      { scope: "review-submit-user", identifier: currentUser.id, limit: 10, windowMs: 60 * 60_000 },
      { scope: "review-submit-ip", identifier: getClientIp(request), limit: 25, windowMs: 60 * 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 16_384) return NextResponse.json({ error: "Review is too large" }, { status: 413 });

    const body = await request.json();
    const listingId = typeof body.listingId === "string" ? body.listingId : "";
    const rating = Number(body.rating);
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!/^[a-f\d]{24}$/i.test(listingId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 3 || text.length > 2_000) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const requestedReservationId =
      typeof body.reservationId === "string" && /^[a-f\d]{24}$/i.test(body.reservationId)
        ? body.reservationId
        : null;

    // Check if user has completed a reservation for this listing at least 1 day ago
    const completedBooking = await prisma.reservation.findFirst({
      where: {
        ...(requestedReservationId ? { id: requestedReservationId } : {}),
        userId: currentUser.id,
        listingId: listingId,
        status: "COMPLETED",
        endDate: { lte: oneDayAgo }, // Ensures the review can be left only after one day
      },
      select: { id: true },
    });

    if (!completedBooking) {
      return NextResponse.json(
        { error: "You can only review after one day of trip completion" },
        { status: 403 }
      );
    }

    const existingReview = await prisma.review.findUnique({
      where: { userId_listingId: { userId: currentUser.id, listingId } },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this listing" },
        { status: 403 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const review = await prisma.review.create({
      data: {
        userId: currentUser.id,
        listingId,
        reservationId: completedBooking.id,
        rating,
        text,
      },
    });

    // Reveal both sides now if the host has already reviewed the guest.
    const published = await maybePublishTripReviews(completedBooking.id).catch((error) => {
      console.error("Review publish check failed", error);
      return false;
    });

    try {
      if (!published) {
        await notificationService.notifyReviewReceived(
          listing.userId,
          currentUser.name || "Someone",
          listing.title,
          rating,
          listingId,
        );
      }
    } catch (notificationError) {
      console.error("Error sending review notification:", notificationError);
      // Don't fail the review creation if notification fails
    }

    await writeAuditEvent({ request, actorUserId: currentUser.id, action: "REVIEW_CREATED", targetType: "Review", targetId: review.id, metadata: { listingId, rating } });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const POST = monitorApiRoute("/api/reviews", POSTHandler, "POST");
