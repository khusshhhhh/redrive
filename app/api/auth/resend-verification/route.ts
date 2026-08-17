import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import {
  createVerificationCode,
  hashVerificationCode,
  sendVerificationEmail,
  verificationExpiry,
} from "@/app/libs/emailVerification";
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";

export async function POST(request: Request) {
  const { email: rawEmail } = await request.json();
  const email = rawEmail?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const rateLimit = await consumeRateLimits([
    { scope: "resend-ip", identifier: getClientIp(request), limit: 10, windowMs: 60 * 60_000 },
    { scope: "resend-account", identifier: email, limit: 4, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) {
    return NextResponse.json({ sent: true });
  }

  if (user.verificationCodeSentAt && Date.now() - user.verificationCodeSentAt.getTime() < 60_000) {
    return NextResponse.json({ error: "Please wait a minute before requesting another code" }, { status: 429 });
  }

  const code = createVerificationCode();
  await prisma.user.update({
    where: { email },
    data: {
      verificationCodeHash: hashVerificationCode(code),
      verificationCodeExpires: verificationExpiry(),
      verificationCodeSentAt: new Date(),
      verificationAttempts: 0,
    },
  });
  const delivery = await sendVerificationEmail(email, code);

  return NextResponse.json({ sent: true, ...(delivery.previewCode ? { previewCode: delivery.previewCode } : {}) });
}
