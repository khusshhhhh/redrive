import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import {
  createVerificationCode,
  hashVerificationCode,
  sendVerificationEmail,
  verificationExpiry,
} from "@/app/libs/emailVerification";
import {
  isValidAustralianMobile,
  isValidDateOfBirth,
  normalizeAustralianMobile,
} from "@/app/libs/profileValidation";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

const duplicateEmailResponse = (emailVerified = false) => NextResponse.json(
  {
    code: "EMAIL_ALREADY_REGISTERED",
    error: emailVerified
      ? "This email is already connected to a Redrive account. Sign in instead."
      : "A Redrive signup has already been started with this email. Sign in or finish verifying that account.",
    emailVerified,
  },
  { status: 409 }
);

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const rateLimit = await consumeRateLimits([
    { scope: "signup-check-ip", identifier: getClientIp(request), limit: 30, windowMs: 15 * 60_000 },
    { scope: "signup-check-email", identifier: email, limit: 8, windowMs: 15 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const user = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } });
  return NextResponse.json({ exists: !!user, emailVerified: !!user?.emailVerified });
}

export async function POST(request: Request) {
  try {
    let body;

    try {
      body = await request.json();
    } catch (error) {
      console.error("❌ Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }


    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "Request body is missing" },
        { status: 400 }
      );
    }

    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const number = body.number?.trim();
    const dateOfBirth = body.dateOfBirth?.trim();
    const { password } = body;

    const rateLimit = await consumeRateLimits([
      { scope: "signup-ip", identifier: getClientIp(request), limit: 5, windowMs: 60 * 60_000 },
      { scope: "signup-email", identifier: email || "missing", limit: 3, windowMs: 60 * 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    if (!email || !name || !password || !number || !dateOfBirth ||
      !body.streetAddress?.trim() || !body.suburb?.trim() || !body.state?.trim()) {
      return NextResponse.json(
        { error: "Complete all required signup details" },
        { status: 400 }
      );
    }

    if (!isValidAustralianMobile(number)) {
      return NextResponse.json(
        { error: "Enter a valid Australian mobile number" },
        { status: 400 }
      );
    }

    if (!isValidDateOfBirth(dateOfBirth)) {
      return NextResponse.json(
        { error: "Enter a valid date of birth" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) return duplicateEmailResponse(!!existingUser.emailVerified);

    const passwordIsStrong = password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
    if (!passwordIsStrong) {
      return NextResponse.json(
        { error: "Password must include uppercase, lowercase, number and symbol" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const code = createVerificationCode();
    const verificationData = {
      name,
      number: normalizeAustralianMobile(number),
      dateOfBirth,
      streetAddress: body.streetAddress.trim(),
      suburb: body.suburb.trim(),
      state: body.state.trim(),
      postcode: body.postcode?.toString().trim() || "",
      hobbies: typeof body.hobbies === "string"
        ? body.hobbies.split(",").map((item: string) => item.trim()).filter(Boolean)
        : [],
      dreamDestinations: typeof body.dreamDestinations === "string"
        ? body.dreamDestinations.split(",").map((item: string) => item.trim()).filter(Boolean)
        : [],
      hashedPassword,
      verificationCodeHash: hashVerificationCode(code),
      verificationCodeExpires: verificationExpiry(),
      verificationCodeSentAt: new Date(),
      verificationAttempts: 0,
      verificationRequired: true,
    };

    const user = await prisma.user.create({ data: { email, ...verificationData } });

    await writeAuditEvent({ request, actorUserId: user.id, action: "ACCOUNT_CREATED", targetType: "User", targetId: user.id });

    const delivery = await sendVerificationEmail(email, code, name);

    return NextResponse.json(
      {
        email: user.email,
        requiresVerification: true,
        ...(delivery.previewCode ? { previewCode: delivery.previewCode } : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return duplicateEmailResponse();
    }
    console.error("❌ Error registering user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create account" },
      { status: 500 }
    );
  }
}
