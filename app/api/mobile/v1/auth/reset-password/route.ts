import bcrypt from "bcryptjs";
import { resetPasswordRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { revokeAllMobileSessions } from "@/app/libs/mobile-auth/sessions";
import { mobileError, mobileJson, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, securityHash, writeAuditEvent } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const parsed = await parseMobileJson(request, resetPasswordRequestSchema);
  if (!parsed.ok) return parsed.response;
  const rateLimit = await consumeRateLimits([{ scope: "mobile-password-reset-use-ip", identifier: getClientIp(request), limit: 10, windowMs: 60 * 60_000 }]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many reset attempts. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: securityHash(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) return mobileError(request, 400, "RESET_TOKEN_INVALID", "This reset link is invalid or has expired.");
  const changedAt = new Date();
  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  const consumed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: changedAt } }, data: { usedAt: changedAt } });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: record.userId }, data: { hashedPassword, passwordChangedAt: changedAt, loginOtpCodeHash: null, loginOtpCodeExpires: null } });
    await tx.userSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: changedAt } });
    return true;
  });
  if (!consumed) return mobileError(request, 400, "RESET_TOKEN_INVALID", "This reset link is invalid or has expired.");
  await revokeAllMobileSessions(record.userId, "PASSWORD_RESET");
  await writeAuditEvent({ request, actorUserId: record.userId, action: "PASSWORD_RESET_COMPLETED", targetType: "User", targetId: record.userId });
  return mobileJson(request, { changed: true });
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/reset-password", POSTHandler, "POST");
