import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  isValidAustralianMobile,
  isAtLeast18,
  isValidDateOfBirth,
  normalizeAustralianMobile,
} from "@/app/libs/profileValidation";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

const validText = (value: unknown, max: number) => typeof value === "string" && value.length <= max;

function validProfileImage(value: unknown) {
  if (value === "" || value === "/images/placeholder.png") return true;
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["res.cloudinary.com", "lh3.googleusercontent.com"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function PUTHandler(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const rateLimit = await consumeRateLimits([
      { scope: "profile-update-user", identifier: currentUser.id, limit: 20, windowMs: 60 * 60_000 },
      { scope: "profile-update-ip", identifier: getClientIp(request), limit: 40, windowMs: 60 * 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 32_768) return NextResponse.json({ error: "Profile update is too large" }, { status: 413 });

    const body = await request.json();
    const {
      name,
      number,
      dateOfBirth,
      streetAddress,
      suburb,
      state,
      postcode,
      hobbies,
      dreamDestinations,
      image,
    } = body;

    const profileStringsAreValid = [
      [name, 100],
      [number, 30],
      [dateOfBirth, 10],
      [streetAddress, 180],
      [suburb, 100],
      [state, 30],
      [postcode, 10],
    ].every(([value, max]) => validText(value, Number(max)));
    const profileListsAreValid = [hobbies, dreamDestinations].every((value) =>
      Array.isArray(value) && value.length <= 20 && value.every((item) => validText(item, 80))
    );
    if (!profileStringsAreValid || !profileListsAreValid || !validProfileImage(image)) {
      return NextResponse.json({ error: "Profile details contain an invalid or oversized value" }, { status: 400 });
    }

    if (number && !isValidAustralianMobile(number)) {
      return NextResponse.json(
        { error: "Enter a valid Australian mobile number" },
        { status: 400 }
      );
    }

    if (dateOfBirth && (!isValidDateOfBirth(dateOfBirth) || !isAtLeast18(dateOfBirth))) {
      return NextResponse.json(
        { error: "Account holders must be at least 18" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { name: true, dateOfBirth: true, licenseStatus: true },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const verifiedIdentityChanged = existingUser.licenseStatus === "VERIFIED" &&
      ((name ?? "") !== (existingUser.name ?? "") ||
        (dateOfBirth ?? "") !== (existingUser.dateOfBirth ?? ""));

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name ?? "",
        number: number ? normalizeAustralianMobile(number) : "",
        dateOfBirth: dateOfBirth ?? "",
        streetAddress: streetAddress ?? "",
        suburb: suburb ?? "",
        state: state ?? "",
        postcode: postcode ?? "",
        hobbies: Array.isArray(hobbies) ? hobbies : [],
        dreamDestinations: Array.isArray(dreamDestinations)
          ? dreamDestinations
          : [],
        image: image ?? "",
        ...(verifiedIdentityChanged ? {
          licenseStatus: "DETAILS_MISMATCH",
          licenseNameMatches: false,
          licenseDobMatches: false,
          licenseVerifiedAt: null,
          licenseRejectionReason: "Your profile name or date of birth changed after the licence check. Check the licence again.",
          profileVerified: "N",
        } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        number: true,
        dateOfBirth: true,
        image: true,
        streetAddress: true,
        suburb: true,
        state: true,
        postcode: true,
        hobbies: true,
        dreamDestinations: true,
        profileVerified: true,
        licenseStatus: true,
        licenseExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await writeAuditEvent({ request, actorUserId: currentUser.id, action: "PROFILE_UPDATED", targetType: "User", targetId: currentUser.id });
    return NextResponse.json(updatedUser, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export const PUT = monitorApiRoute("/api/profile", PUTHandler, "PUT");
