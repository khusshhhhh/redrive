import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { isVerificationCodeValid } from "@/app/libs/emailVerification";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

export async function POST(request: Request) {
  const { email: rawEmail, code: rawCode } = await request.json();
  const email = rawEmail?.trim().toLowerCase();
  const code = rawCode?.replace(/\D/g, "");

  const rateLimit = await consumeRateLimits([
    { scope: "verify-email-ip", identifier: getClientIp(request), limit: 20, windowMs: 15 * 60_000 },
    { scope: "verify-email-account", identifier: email || "missing", limit: 8, windowMs: 15 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  if (!email || code?.length !== 6) {
    return NextResponse.json({ error: "Enter the six-digit code" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.verificationCodeHash || !user.verificationCodeExpires) {
    return NextResponse.json({ error: "This verification request is no longer valid" }, { status: 400 });
  }

  if (user.verificationCodeExpires.getTime() < Date.now()) {
    return NextResponse.json({ error: "That code has expired. Request a new one." }, { status: 400 });
  }

  if (!isVerificationCodeValid(code, user.verificationCodeHash)) {
    const finalAttempt = user.verificationAttempts >= 4;
    await prisma.user.update({
      where: { email },
      data: finalAttempt
        ? { verificationCodeHash: null, verificationCodeExpires: null, verificationAttempts: 0 }
        : { verificationAttempts: { increment: 1 } },
    });
    return NextResponse.json(
      { error: finalAttempt ? "Too many attempts. Request a new code." : "That code is not correct" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { email },
    data: {
      emailVerified: new Date(),
      verificationCodeHash: null,
      verificationCodeExpires: null,
      verificationCodeSentAt: null,
      verificationAttempts: 0,
      verificationRequired: false,
    },
  });

  await writeAuditEvent({ request, actorUserId: user.id, action: "EMAIL_VERIFIED", targetType: "User", targetId: user.id });

  return NextResponse.json({ verified: true });
}
