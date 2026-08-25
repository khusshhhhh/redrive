import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAccountDeletionBlocker, permanentlyDeleteAccount } from "@/app/libs/accountDeletion";
import {
  createVerificationCode,
  hashVerificationCode,
  isVerificationCodeValid,
  sendAccountDeletionOtpEmail,
  verificationExpiry,
} from "@/app/libs/emailVerification";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";
import { monitorApiRoute } from "@/app/libs/apiMonitoring";

const noStore = (body: Record<string, unknown>, init?: ResponseInit) =>
  NextResponse.json(body, {
    ...init,
    headers: { ...init?.headers, "Cache-Control": "private, no-store" },
  });

async function authenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      licenseImage: true,
      licensePublicId: true,
      licenseBackPublicId: true,
      stripeConnectedAccountId: true,
      accountDeletionCodeHash: true,
      accountDeletionCodeExpires: true,
      accountDeletionCodeSentAt: true,
      accountDeletionAttempts: true,
    },
  });
}

async function POSTHandler(request: Request) {
  const user = await authenticatedUser();
  if (!user?.email) return noStore({ error: "Authentication required" }, { status: 401 });

  const rateLimit = await consumeRateLimits([
    { scope: "delete-account-request-user", identifier: user.id, limit: 3, windowMs: 60 * 60_000 },
    { scope: "delete-account-request-ip", identifier: getClientIp(request), limit: 8, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  if (user.accountDeletionCodeSentAt && Date.now() - user.accountDeletionCodeSentAt.getTime() < 60_000) {
    return noStore({ error: "Wait one minute before requesting another code" }, { status: 429 });
  }

  const blocker = await getAccountDeletionBlocker(user.id);
  if (blocker) return noStore({ error: blocker, code: "ACCOUNT_DELETION_BLOCKED" }, { status: 409 });

  const code = createVerificationCode();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      accountDeletionCodeHash: hashVerificationCode(code),
      accountDeletionCodeExpires: verificationExpiry(),
      accountDeletionCodeSentAt: new Date(),
      accountDeletionAttempts: 0,
    },
  });

  try {
    const delivery = await sendAccountDeletionOtpEmail(user.email, code, user.name);
    await writeAuditEvent({ request, actorUserId: user.id, action: "ACCOUNT_DELETION_CODE_SENT", targetType: "User", targetId: user.id });
    return noStore({ sent: true, previewCode: delivery.previewCode });
  } catch (error) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountDeletionCodeHash: null,
        accountDeletionCodeExpires: null,
        accountDeletionCodeSentAt: null,
        accountDeletionAttempts: 0,
      },
    });
    console.error("Account deletion email failed", error);
    return noStore({ error: "The confirmation email could not be sent. Please try again later." }, { status: 503 });
  }
}

async function DELETEHandler(request: Request) {
  const user = await authenticatedUser();
  if (!user) return noStore({ error: "Authentication required" }, { status: 401 });

  const rateLimit = await consumeRateLimits([
    { scope: "delete-account-confirm-user", identifier: user.id, limit: 6, windowMs: 15 * 60_000 },
    { scope: "delete-account-confirm-ip", identifier: getClientIp(request), limit: 12, windowMs: 15 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4_096) return noStore({ error: "Invalid request" }, { status: 413 });
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  const confirmation = typeof body.confirmation === "string" ? body.confirmation.trim() : "";

  if (confirmation !== "DELETE") {
    return noStore({ error: "Type DELETE exactly to confirm this permanent action" }, { status: 400 });
  }
  if (code.length !== 6 || !user.accountDeletionCodeHash || !user.accountDeletionCodeExpires) {
    return noStore({ error: "Request and enter a valid six-digit deletion code" }, { status: 400 });
  }
  if (user.accountDeletionCodeExpires.getTime() < Date.now()) {
    return noStore({ error: "That deletion code has expired. Request a new one." }, { status: 400 });
  }

  if (!isVerificationCodeValid(code, user.accountDeletionCodeHash)) {
    const locked = user.accountDeletionAttempts >= 4;
    await prisma.user.update({
      where: { id: user.id },
      data: locked
        ? {
            accountDeletionCodeHash: null,
            accountDeletionCodeExpires: null,
            accountDeletionCodeSentAt: null,
            accountDeletionAttempts: 0,
          }
        : { accountDeletionAttempts: { increment: 1 } },
    });
    return noStore({ error: locked ? "Too many incorrect attempts. Request a new code." : "That deletion code is incorrect" }, { status: 400 });
  }

  const blocker = await getAccountDeletionBlocker(user.id);
  if (blocker) return noStore({ error: blocker, code: "ACCOUNT_DELETION_BLOCKED" }, { status: 409 });

  try {
    await permanentlyDeleteAccount(user);
    return noStore({ deleted: true });
  } catch (error) {
    console.error("Permanent account deletion failed", error);
    await writeAuditEvent({ request, actorUserId: user.id, action: "ACCOUNT_DELETION_FAILED", targetType: "User", targetId: user.id });
    return noStore(
      { error: "Your account was not deleted because all records could not be removed safely. Please try again or contact support." },
      { status: 503 },
    );
  }
}

export const POST = monitorApiRoute("/api/profile/delete-account", POSTHandler, "POST");
export const DELETE = monitorApiRoute("/api/profile/delete-account", DELETEHandler, "DELETE");
