import { verifyLoginOtpRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { isVerificationCodeValid } from "@/app/libs/emailVerification";
import { mobileAuthErrorResponse } from "@/app/libs/mobile-auth/route-utils";
import { createMobileSession } from "@/app/libs/mobile-auth/sessions";
import { mobileError, mobileJson, mobileUnexpectedError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const parsed = await parseMobileJson(request, verifyLoginOtpRequestSchema);
  if (!parsed.ok) return parsed.response;
  const challenge = await prisma.mobileAuthChallenge.findUnique({ where: { id: parsed.data.challengeId } });
  if (!challenge || challenge.purpose !== "LOGIN_OTP" || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now()) return mobileError(request, 400, "LOGIN_OTP_EXPIRED", "That login challenge has expired. Sign in again.");
  const rateLimit = await consumeRateLimits([
    { scope: "mobile-login-otp-ip", identifier: getClientIp(request), limit: 15, windowMs: 15 * 60_000 },
    { scope: "mobile-login-otp-user", identifier: challenge.userId, limit: 8, windowMs: 15 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many code attempts. Wait and sign in again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });

  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user?.loginOtpCodeHash || !user.loginOtpCodeExpires || user.loginOtpCodeExpires.getTime() <= Date.now()) return mobileError(request, 400, "LOGIN_OTP_EXPIRED", "That code has expired. Sign in again.");
  if (!isVerificationCodeValid(parsed.data.code, user.loginOtpCodeHash)) {
    const locked = challenge.attempts >= 4 || user.loginOtpAttempts >= 4;
    await prisma.$transaction([
      prisma.mobileAuthChallenge.update({ where: { id: challenge.id }, data: locked ? { consumedAt: new Date(), attempts: { increment: 1 } } : { attempts: { increment: 1 } } }),
      prisma.user.update({ where: { id: user.id }, data: locked ? { loginOtpCodeHash: null, loginOtpCodeExpires: null, loginOtpCodeSentAt: null, loginOtpAttempts: 0 } : { loginOtpAttempts: { increment: 1 } } }),
    ]);
    return mobileError(request, 400, locked ? "LOGIN_OTP_LOCKED" : "LOGIN_OTP_INVALID", locked ? "Too many incorrect codes. Sign in again." : "That code is not correct.");
  }

  const consumed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.mobileAuthChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: user.id }, data: { loginOtpCodeHash: null, loginOtpCodeExpires: null, loginOtpCodeSentAt: null, loginOtpAttempts: 0 } });
    return true;
  });
  if (!consumed) return mobileError(request, 409, "LOGIN_OTP_ALREADY_USED", "That login challenge was already used. Sign in again.");
  try {
    return mobileJson(request, await createMobileSession({ userId: user.id, request, device: { deviceId: challenge.deviceId, deviceName: challenge.deviceName || undefined, platform: challenge.platform as "ios" | "android", appVersion: challenge.appVersion || undefined } }));
  } catch (error) {
    return mobileAuthErrorResponse(request, error) || mobileUnexpectedError(request, error, "Mobile OTP login failed");
  }
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/login/verify-otp", POSTHandler, "POST");
