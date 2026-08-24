import { deleteAccountRequestSchema, profilePatchRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { getAccountDeletionBlocker, permanentlyDeleteAccount } from "@/app/libs/accountDeletion";
import { isVerificationCodeValid } from "@/app/libs/emailVerification";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { getMobileUser, mobileUserSelect, toMobileUser } from "@/app/libs/mobile-auth/users";
import { mobileError, mobileJson, mobileUnexpectedError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { isAtLeast18, isValidAustralianMobile, isValidDateOfBirth, normalizeAustralianMobile } from "@/app/libs/profileValidation";
import { consumeRateLimits, getClientIp, writeAuditEvent } from "@/app/libs/security";

function validProfileImage(value: string | null | undefined) {
  if (value === undefined || value === null || value === "" || value === "/images/placeholder.png") return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["res.cloudinary.com", "lh3.googleusercontent.com"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function GETHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const user = await getMobileUser(auth.identity.userId);
  return user ? mobileJson(request, { user }) : mobileError(request, 404, "USER_NOT_FOUND", "The account no longer exists.");
}

async function PATCHHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, profilePatchRequestSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;
  const rateLimit = await consumeRateLimits([
    { scope: "mobile-profile-update-user", identifier: auth.identity.userId, limit: 20, windowMs: 60 * 60_000 },
    { scope: "mobile-profile-update-ip", identifier: getClientIp(request), limit: 40, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many profile updates. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });
  if (input.number && !isValidAustralianMobile(input.number)) return mobileError(request, 400, "INVALID_MOBILE", "Enter a valid Australian mobile number.", { number: "Enter an Australian mobile number." });
  if (input.dateOfBirth && (!isValidDateOfBirth(input.dateOfBirth) || !isAtLeast18(input.dateOfBirth))) return mobileError(request, 400, "AGE_REQUIREMENT", "Account holders must be at least 18.", { dateOfBirth: "Enter a valid adult date of birth." });
  if (!validProfileImage(input.image)) return mobileError(request, 400, "INVALID_PROFILE_IMAGE", "Use an uploaded Redrive profile image.", { image: "The image URL is not allowed." });

  const existing = await prisma.user.findUnique({ where: { id: auth.identity.userId }, select: { name: true, dateOfBirth: true, licenseStatus: true } });
  if (!existing) return mobileError(request, 404, "USER_NOT_FOUND", "The account no longer exists.");
  const verifiedIdentityChanged = existing.licenseStatus === "VERIFIED" && ((input.name !== undefined && input.name !== (existing.name || "")) || (input.dateOfBirth !== undefined && input.dateOfBirth !== (existing.dateOfBirth || "")));
  const updated = await prisma.user.update({
    where: { id: auth.identity.userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.number !== undefined ? { number: input.number ? normalizeAustralianMobile(input.number) : "" } : {}),
      ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
      ...(input.streetAddress !== undefined ? { streetAddress: input.streetAddress } : {}),
      ...(input.suburb !== undefined ? { suburb: input.suburb } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.postcode !== undefined ? { postcode: input.postcode } : {}),
      ...(input.hobbies !== undefined ? { hobbies: input.hobbies } : {}),
      ...(input.dreamDestinations !== undefined ? { dreamDestinations: input.dreamDestinations } : {}),
      ...(input.image !== undefined ? { image: input.image || "" } : {}),
      ...(verifiedIdentityChanged ? { licenseStatus: "DETAILS_MISMATCH", licenseNameMatches: false, licenseDobMatches: false, licenseVerifiedAt: null, licenseRejectionReason: "Your profile identity details changed after the licence check. Check the licence again.", profileVerified: "N" } : {}),
    },
    select: mobileUserSelect,
  });
  await writeAuditEvent({ request, actorUserId: auth.identity.userId, action: "PROFILE_UPDATED", targetType: "User", targetId: auth.identity.userId });
  return mobileJson(request, { user: toMobileUser(updated) });
}

async function DELETEHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, deleteAccountRequestSchema);
  if (!parsed.ok) return parsed.response;
  const rateLimit = await consumeRateLimits([
    { scope: "mobile-delete-account-confirm-user", identifier: auth.identity.userId, limit: 6, windowMs: 15 * 60_000 },
    { scope: "mobile-delete-account-confirm-ip", identifier: getClientIp(request), limit: 12, windowMs: 15 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many deletion attempts. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });
  const user = await prisma.user.findUnique({
    where: { id: auth.identity.userId },
    select: { id: true, email: true, image: true, licenseImage: true, licensePublicId: true, licenseBackPublicId: true, stripeConnectedAccountId: true, accountDeletionCodeHash: true, accountDeletionCodeExpires: true, accountDeletionAttempts: true },
  });
  if (!user?.accountDeletionCodeHash || !user.accountDeletionCodeExpires) return mobileError(request, 400, "DELETION_CODE_REQUIRED", "Request and enter a valid deletion code.");
  if (user.accountDeletionCodeExpires.getTime() <= Date.now()) return mobileError(request, 400, "DELETION_CODE_EXPIRED", "That deletion code has expired. Request a new one.");
  if (!isVerificationCodeValid(parsed.data.code, user.accountDeletionCodeHash)) {
    const locked = user.accountDeletionAttempts >= 4;
    await prisma.user.update({ where: { id: user.id }, data: locked ? { accountDeletionCodeHash: null, accountDeletionCodeExpires: null, accountDeletionCodeSentAt: null, accountDeletionAttempts: 0 } : { accountDeletionAttempts: { increment: 1 } } });
    return mobileError(request, 400, locked ? "DELETION_CODE_LOCKED" : "DELETION_CODE_INCORRECT", locked ? "Too many incorrect attempts. Request a new code." : "That deletion code is incorrect.");
  }
  const blocker = await getAccountDeletionBlocker(user.id);
  if (blocker) return mobileError(request, 409, "ACCOUNT_DELETION_BLOCKED", blocker);
  try {
    await permanentlyDeleteAccount(user);
    return mobileJson(request, { deleted: true });
  } catch (error) {
    await writeAuditEvent({ request, actorUserId: user.id, action: "ACCOUNT_DELETION_FAILED", targetType: "User", targetId: user.id });
    return mobileUnexpectedError(request, error, "Mobile account deletion failed");
  }
}

export const GET = monitorApiRoute("/api/mobile/v1/me", GETHandler, "GET");
export const PATCH = monitorApiRoute("/api/mobile/v1/me", PATCHHandler, "PATCH");
export const DELETE = monitorApiRoute("/api/mobile/v1/me", DELETEHandler, "DELETE");
