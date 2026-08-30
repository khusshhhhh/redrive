import { verifyEmailRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { isVerificationCodeValid, sendWelcomeEmail } from "@/app/libs/emailVerification";
import { mobileError, mobileJson, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, writeAuditEvent } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const parsed = await parseMobileJson(request, verifyEmailRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { email, code } = parsed.data;
  const rateLimit = await consumeRateLimits([
    { scope: "mobile-verify-email-ip", identifier: getClientIp(request), limit: 20, windowMs: 15 * 60_000 },
    { scope: "mobile-verify-email-account", identifier: email, limit: 8, windowMs: 15 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many verification attempts. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.verificationCodeHash || !user.verificationCodeExpires) return mobileError(request, 400, "VERIFICATION_INVALID", "This verification request is no longer valid.");
  if (user.verificationCodeExpires.getTime() <= Date.now()) return mobileError(request, 400, "VERIFICATION_EXPIRED", "That code has expired. Request a new one.");
  if (!isVerificationCodeValid(code, user.verificationCodeHash)) {
    const locked = user.verificationAttempts >= 4;
    await prisma.user.update({ where: { id: user.id }, data: locked ? { verificationCodeHash: null, verificationCodeExpires: null, verificationAttempts: 0 } : { verificationAttempts: { increment: 1 } } });
    return mobileError(request, 400, locked ? "VERIFICATION_LOCKED" : "VERIFICATION_INCORRECT", locked ? "Too many attempts. Request a new code." : "That code is not correct.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verificationCodeHash: null, verificationCodeExpires: null, verificationCodeSentAt: null, verificationAttempts: 0, verificationRequired: false },
  });
  await writeAuditEvent({ request, actorUserId: user.id, action: "EMAIL_VERIFIED", targetType: "User", targetId: user.id });

  // Best-effort onboarding email, sent only the first time an address is
  // confirmed — never block verification on delivery.
  if (!user.emailVerified) {
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      console.error("Welcome email failed to send", error);
    }
  }

  return mobileJson(request, { verified: true });
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/verify-email", POSTHandler, "POST");
