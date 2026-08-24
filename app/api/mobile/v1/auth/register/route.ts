import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { registerRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { createVerificationCode, hashVerificationCode, sendVerificationEmail, verificationExpiry } from "@/app/libs/emailVerification";
import { mobileError, mobileJson, mobileUnexpectedError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { isAtLeast18, isValidAustralianMobile, isValidDateOfBirth, normalizeAustralianMobile } from "@/app/libs/profileValidation";
import { consumeRateLimits, getClientIp, writeAuditEvent } from "@/app/libs/security";
import { allowMobileAuthPreviews } from "@/app/libs/mobile-auth/config";

async function POSTHandler(request: Request) {
  const parsed = await parseMobileJson(request, registerRequestSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const rateLimit = await consumeRateLimits([
    { scope: "mobile-signup-ip", identifier: getClientIp(request), limit: 5, windowMs: 60 * 60_000 },
    { scope: "mobile-signup-email", identifier: input.email, limit: 3, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many signup attempts. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });
  if (!isValidAustralianMobile(input.number)) return mobileError(request, 400, "INVALID_MOBILE", "Enter a valid Australian mobile number.", { number: "Enter an Australian mobile number." });
  if (!isValidDateOfBirth(input.dateOfBirth) || !isAtLeast18(input.dateOfBirth)) return mobileError(request, 400, "AGE_REQUIREMENT", "You must be at least 18 to create a Redrive account.", { dateOfBirth: "Account holders must be at least 18." });

  try {
    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { emailVerified: true } });
    if (existing) return mobileError(request, 409, "EMAIL_ALREADY_REGISTERED", existing.emailVerified ? "This email is already connected to an account. Sign in instead." : "A signup already exists for this email. Verify it or sign in.");

    const code = createVerificationCode();
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        number: normalizeAustralianMobile(input.number),
        dateOfBirth: input.dateOfBirth,
        streetAddress: input.streetAddress,
        suburb: input.suburb,
        state: input.state,
        postcode: input.postcode,
        hobbies: input.hobbies,
        dreamDestinations: input.dreamDestinations,
        hashedPassword: await bcrypt.hash(input.password, 12),
        verificationCodeHash: hashVerificationCode(code),
        verificationCodeExpires: verificationExpiry(),
        verificationCodeSentAt: new Date(),
        verificationAttempts: 0,
        verificationRequired: true,
      },
    });
    await writeAuditEvent({ request, actorUserId: user.id, action: "ACCOUNT_CREATED", targetType: "User", targetId: user.id });
    const delivery = await sendVerificationEmail(input.email, code, input.name);
    return mobileJson(request, {
      email: input.email,
      requiresVerification: true,
      ...(allowMobileAuthPreviews() && delivery.previewCode ? { previewCode: delivery.previewCode } : {}),
    }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return mobileError(request, 409, "EMAIL_ALREADY_REGISTERED", "This email is already connected to an account.");
    }
    return mobileUnexpectedError(request, error, "Mobile registration failed");
  }
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/register", POSTHandler, "POST");
