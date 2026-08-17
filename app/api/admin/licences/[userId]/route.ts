import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getAdminUser } from "@/app/libs/adminAuth";
import { writeAuditEvent } from "@/app/libs/security";

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status.toUpperCase() : "";
  if (!["VERIFIED", "REJECTED", "EXPIRED"].includes(status)) return NextResponse.json({ error: "Invalid licence status" }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: userId },
    data: { licenseStatus: status, profileVerified: status === "VERIFIED" ? "Y" : status === "REJECTED" ? "REJECTED" : "N", licenseReviewedAt: new Date(), licenseReviewedBy: admin.id, licenseRejectionReason: status === "REJECTED" && typeof body.reason === "string" ? body.reason.slice(0, 500) : null, licenseExpiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined },
    select: { id: true, licenseStatus: true, profileVerified: true, licenseExpiresAt: true },
  });
  await writeAuditEvent({ request, actorUserId: admin.id, action: `LICENCE_${status}`, targetType: "User", targetId: userId, reason: body.reason });
  return NextResponse.json(user);
}
