import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { getAccountDeletionBlocker } from "@/app/libs/accountDeletion";
import { createVerificationCode, hashVerificationCode, sendAccountDeletionOtpEmail, verificationExpiry } from "@/app/libs/emailVerification";
import { allowMobileAuthPreviews } from "@/app/libs/mobile-auth/config";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileError, mobileJson, mobileUnexpectedError } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, writeAuditEvent } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const rateLimit = await consumeRateLimits([
    { scope: "mobile-delete-account-request-user", identifier: auth.identity.userId, limit: 3, windowMs: 60 * 60_000 },
    { scope: "mobile-delete-account-request-ip", identifier: getClientIp(request), limit: 8, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many deletion-code requests. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });
  const user = await prisma.user.findUnique({ where: { id: auth.identity.userId }, select: { id: true, email: true, name: true, accountDeletionCodeSentAt: true } });
  if (!user?.email) return mobileError(request, 404, "USER_NOT_FOUND", "The account no longer exists.");
  if (user.accountDeletionCodeSentAt && Date.now() - user.accountDeletionCodeSentAt.getTime() < 60_000) return mobileError(request, 429, "RESEND_TOO_SOON", "Wait one minute before requesting another code.", undefined, { "Retry-After": "60" });
  const blocker = await getAccountDeletionBlocker(user.id);
  if (blocker) return mobileError(request, 409, "ACCOUNT_DELETION_BLOCKED", blocker);
  const code = createVerificationCode();
  await prisma.user.update({ where: { id: user.id }, data: { accountDeletionCodeHash: hashVerificationCode(code), accountDeletionCodeExpires: verificationExpiry(), accountDeletionCodeSentAt: new Date(), accountDeletionAttempts: 0 } });
  try {
    const delivery = await sendAccountDeletionOtpEmail(user.email, code, user.name);
    await writeAuditEvent({ request, actorUserId: user.id, action: "ACCOUNT_DELETION_CODE_SENT", targetType: "User", targetId: user.id });
    return mobileJson(request, { sent: true, ...(allowMobileAuthPreviews() && delivery.previewCode ? { previewCode: delivery.previewCode } : {}) });
  } catch (error) {
    await prisma.user.update({ where: { id: user.id }, data: { accountDeletionCodeHash: null, accountDeletionCodeExpires: null, accountDeletionCodeSentAt: null, accountDeletionAttempts: 0 } });
    return mobileUnexpectedError(request, error, "Mobile account deletion email failed");
  }
}

export const POST = monitorApiRoute("/api/mobile/v1/me/deletion-code", POSTHandler, "POST");
