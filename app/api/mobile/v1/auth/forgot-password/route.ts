import crypto from "crypto";
import { forgotPasswordRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { sendPasswordResetEmail } from "@/app/libs/emailVerification";
import { mobileError, mobileJson, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, securityHash, writeAuditEvent } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const parsed = await parseMobileJson(request, forgotPasswordRequestSchema);
  if (!parsed.ok) return parsed.response;
  const rateLimit = await consumeRateLimits([
    { scope: "mobile-password-reset-ip", identifier: getClientIp(request), limit: 6, windowMs: 60 * 60_000 },
    { scope: "mobile-password-reset-account", identifier: parsed.data.email, limit: 3, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many reset requests. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });
  const generic = { sent: true, message: "If that email belongs to a Redrive account, a reset link is on its way." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, hashedPassword: true } });
  if (!user?.hashedPassword) return mobileJson(request, generic);
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: securityHash(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || new URL(request.url).origin;
  await sendPasswordResetEmail(parsed.data.email, `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`);
  await writeAuditEvent({ request, actorUserId: user.id, action: "PASSWORD_RESET_REQUESTED", targetType: "User", targetId: user.id });
  return mobileJson(request, generic);
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/forgot-password", POSTHandler, "POST");
