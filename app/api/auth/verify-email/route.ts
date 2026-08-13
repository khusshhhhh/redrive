import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { isVerificationCodeValid } from "@/app/libs/emailVerification";

export async function POST(request: Request) {
  const { email: rawEmail, code: rawCode } = await request.json();
  const email = rawEmail?.trim().toLowerCase();
  const code = rawCode?.replace(/\D/g, "");

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

  return NextResponse.json({ verified: true });
}
