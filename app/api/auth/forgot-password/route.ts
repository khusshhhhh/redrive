import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { sendPasswordResetEmail } from "@/app/libs/emailVerification";
import { consumeRateLimits, getClientIp, securityHash, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

  const rateLimit = await consumeRateLimits([
    { scope: "password-reset-ip", identifier: getClientIp(request), limit: 6, windowMs: 60 * 60_000 },
    { scope: "password-reset-account", identifier: email, limit: 3, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const generic = { sent: true, message: "If that email belongs to a Redrive account, a reset link is on its way." };
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, hashedPassword: true } });
  if (!user?.hashedPassword) return NextResponse.json(generic);

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: securityHash(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const delivery = await sendPasswordResetEmail(email, `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`);
  await writeAuditEvent({ request, actorUserId: user.id, action: "PASSWORD_RESET_REQUESTED", targetType: "User", targetId: user.id });
  return NextResponse.json({ ...generic, ...(delivery.previewUrl ? { previewUrl: delivery.previewUrl } : {}) });
}

export const POST = monitorApiRoute("/api/auth/forgot-password", POSTHandler, "POST");
