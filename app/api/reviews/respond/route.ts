import { NextResponse } from "next/server";
import { reviewResponseRequestSchema } from "@redrive/contracts/web";

import prisma from "@/app/libs/prismadb";
import { writeAuditEvent } from "@/app/libs/security";
import { defineApiRoute } from "@/app/libs/defineApiRoute";

export const POST = defineApiRoute(
  {
    path: "/api/reviews/respond",
    method: "POST",
    auth: true,
    body: reviewResponseRequestSchema,
    rateLimit: ({ user, ip }) => [
      { scope: "review-respond-user", identifier: user!.id, limit: 30, windowMs: 60 * 60_000 },
      { scope: "review-respond-ip", identifier: ip, limit: 60, windowMs: 60 * 60_000 },
    ],
  },
  async ({ request, user, body }) => {
    const { reviewId, response } = body;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, response: true, listing: { select: { userId: true } } },
    });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    if (review.listing.userId !== user.id) {
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
      actorUserId: user.id,
      action: "REVIEW_RESPONSE_ADDED",
      targetType: "Review",
      targetId: reviewId,
    });

    return NextResponse.json({
      id: updated.id,
      response: updated.response,
      respondedAt: updated.respondedAt ? updated.respondedAt.toISOString() : null,
    });
  },
);
