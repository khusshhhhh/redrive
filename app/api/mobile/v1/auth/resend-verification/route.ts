import { resendVerificationRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { createVerificationCode, hashVerificationCode, sendVerificationEmail, verificationExpiry } from "@/app/libs/emailVerification";
import { allowMobileAuthPreviews } from "@/app/libs/mobile-auth/config";
import { mobileError, mobileJson, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const parsed = await parseMobileJson(request, resendVerificationRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { email } = parsed.data;
  const rateLimit = await consumeRateLimits([
    { scope: "mobile-resend-ip", identifier: getClientIp(request), limit: 10, windowMs: 60 * 60_000 },
    { scope: "mobile-resend-account", identifier: email, limit: 4, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many requests. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return mobileJson(request, { sent: true });
  if (user.verificationCodeSentAt && Date.now() - user.verificationCodeSentAt.getTime() < 60_000) return mobileError(request, 429, "RESEND_TOO_SOON", "Wait one minute before requesting another code.", undefined, { "Retry-After": "60" });

  const code = createVerificationCode();
  await prisma.user.update({ where: { id: user.id }, data: { verificationCodeHash: hashVerificationCode(code), verificationCodeExpires: verificationExpiry(), verificationCodeSentAt: new Date(), verificationAttempts: 0 } });
  const delivery = await sendVerificationEmail(email, code, user.name);
  return mobileJson(request, { sent: true, ...(allowMobileAuthPreviews() && delivery.previewCode ? { previewCode: delivery.previewCode } : {}) });
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/resend-verification", POSTHandler, "POST");
