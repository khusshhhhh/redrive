import { loginRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { createVerificationCode, hashVerificationCode, sendLoginOtpEmail, verificationExpiry } from "@/app/libs/emailVerification";
import { allowMobileAuthPreviews } from "@/app/libs/mobile-auth/config";
import { mobileAuthErrorResponse } from "@/app/libs/mobile-auth/route-utils";
import { createMobileSession } from "@/app/libs/mobile-auth/sessions";
import { mobileError, mobileJson, mobileUnexpectedError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, writeAuditEvent } from "@/app/libs/security";
import { checkCredentials } from "@/app/libs/credentialCheck";

async function POSTHandler(request: Request) {
  const parsed = await parseMobileJson(request, loginRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { email, password, device } = parsed.data;
  const rateLimit = await consumeRateLimits([
    { scope: "mobile-login-ip", identifier: getClientIp(request), limit: 15, windowMs: 15 * 60_000 },
    { scope: "mobile-login-account", identifier: email, limit: 7, windowMs: 15 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many sign-in attempts. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });

  const check = await checkCredentials(email, password);
  if (!check.ok) {
    await writeAuditEvent({ request, actorUserId: check.user?.id, action: "MOBILE_LOGIN_FAILED", targetType: "User", targetId: check.user?.id, reason: "INVALID_CREDENTIALS" });
    return mobileError(request, 401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  const user = check.user;
  if (user.verificationRequired && !user.emailVerified) return mobileError(request, 403, "EMAIL_VERIFICATION_REQUIRED", "Verify your email before signing in.");

  try {
    if (user.loginOtpEnabled) {
      let previewCode: string | undefined;
      const reusableCode = user.loginOtpCodeHash && user.loginOtpCodeExpires && user.loginOtpCodeExpires.getTime() > Date.now() && user.loginOtpCodeSentAt && Date.now() - user.loginOtpCodeSentAt.getTime() < 60_000;
      if (!reusableCode) {
        const code = createVerificationCode();
        const expiresAt = verificationExpiry();
        await prisma.user.update({ where: { id: user.id }, data: { loginOtpCodeHash: hashVerificationCode(code), loginOtpCodeExpires: expiresAt, loginOtpCodeSentAt: new Date(), loginOtpAttempts: 0 } });
        const delivery = await sendLoginOtpEmail(email, code, user.name);
        if (allowMobileAuthPreviews()) previewCode = delivery.previewCode;
      }
      const refreshed = await prisma.user.findUnique({ where: { id: user.id }, select: { loginOtpCodeExpires: true } });
      const expiresAt = refreshed?.loginOtpCodeExpires || verificationExpiry();
      const challenge = await prisma.mobileAuthChallenge.create({
        data: { userId: user.id, purpose: "LOGIN_OTP", deviceId: device.deviceId, deviceName: device.deviceName || null, platform: device.platform, appVersion: device.appVersion || null, expiresAt },
      });
      return mobileJson(request, { code: "LOGIN_OTP_REQUIRED", challengeId: challenge.id, expiresAt: expiresAt.toISOString(), ...(previewCode ? { previewCode } : {}) }, 202);
    }

    return mobileJson(request, await createMobileSession({ userId: user.id, device, request }));
  } catch (error) {
    return mobileAuthErrorResponse(request, error) || mobileUnexpectedError(request, error, "Mobile login failed");
  }
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/login", POSTHandler, "POST");
