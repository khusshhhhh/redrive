import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await consumeRateLimits([
    { scope: "review-respond-user", identifier: currentUser.id, limit: 30, windowMs: 60 * 60_000 },
    { scope: "review-respond-ip", identifier: getClientIp(request), limit: 60, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const body = await request.json().catch(() => ({}));
  const reviewId = typeof body.reviewId === "string" ? body.reviewId : "";
  const response = typeof body.response === "string" ? body.response.trim() : "";

  if (!/^[a-f\d]{24}$/i.test(reviewId) || response.length < 3 || response.length > 1_500) {
    return NextResponse.json({ error: "Add a reply between 3 and 1,500 characters" }, { status: 400 });
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, response: true, listing: { select: { userId: true } } },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  if (review.listing.userId !== currentUser.id) {
    return NextResponse.json({ error: "Only the host can reply" }, { status: 403 });
  }
  if (review.response) {
    return NextResponse.json({ error: "You have already replied to this review" }, { status: 409 });
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { response, respondedAt: new Date() },
    select: { id: true, response: true, respondedAt: true },
  });

  await writeAuditEvent({
    request,
    actorUserId: currentUser.id,
    action: "REVIEW_RESPONSE_ADDED",
    targetType: "Review",
    targetId: reviewId,
  });

  return NextResponse.json(updated);
}

export const POST = monitorApiRoute("/api/reviews/respond", POSTHandler, "POST");
