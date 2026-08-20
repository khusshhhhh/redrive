import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import prisma from "@/app/libs/prismadb";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  MAX_UPLOAD_BYTES,
  UploadValidationError,
  createOcrImage,
  sanitizeImage,
  validateImageUploadMetadata,
} from "@/app/libs/uploadSecurity";
import { readLicenceImages } from "@/app/libs/googleVision";
import {
  AU_ISSUERS,
  analyzeAustralianLicense,
  isValidLicenseDate,
  licenseExpiryInstant,
  licenseNameMatchesProfile,
  normalizeDocumentNumber,
  todayForIssuer,
  type AustralianIssuer,
} from "@/app/libs/licenseDocument";
import {
  decryptLicenseValue,
  encryptLicenseValue,
  hashLicenseValue,
  lastFour,
} from "@/app/libs/licenseDataProtection";
import {
  consumeRateLimits,
  getClientIp,
  tooManyRequests,
  writeAuditEvent,
} from "@/app/libs/security";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadLicenceImage(buffer: Buffer) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "redrive/licenses",
        resource_type: "image",
        type: "authenticated",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Cloudinary returned no upload result"));
        else resolve(result);
      },
    );
    stream.end(buffer);
  });
}

async function deleteLicenceAsset(publicId?: string | null) {
  if (!publicId?.startsWith("redrive/licenses/")) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  }).catch((error) => console.error("Old licence asset cleanup failed", error));
}

function isConfigured() {
  const dataProtectionConfigured = Boolean(
    process.env.LICENSE_DATA_ENCRYPTION_KEY &&
    process.env.LICENSE_DATA_HMAC_KEY,
  ) || (process.env.NODE_ENV !== "production" && Boolean(process.env.NEXTAUTH_SECRET));
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.GOOGLE_CLOUD_VISION_API_KEY &&
    dataProtectionConfigured,
  );
}

function noStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...init?.headers, "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return noStore({ error: "Authentication required" }, { status: 401 });
    if (!isConfigured()) return noStore({ error: "Licence checking is not configured" }, { status: 503 });

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        licensePublicId: true,
        licenseBackPublicId: true,
      },
    });
    if (!currentUser) return noStore({ error: "User not found" }, { status: 404 });

    const rateLimit = await consumeRateLimits([
      { scope: "licence-analysis-user", identifier: currentUser.id, limit: 5, windowMs: 60 * 60_000 },
      { scope: "licence-analysis-ip", identifier: getClientIp(request), limit: 15, windowMs: 60 * 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > (MAX_UPLOAD_BYTES * 2) + 256 * 1024) {
      return noStore({ error: "Each licence image must be 10 MB or smaller" }, { status: 413 });
    }

    const formData = await request.formData();
    const front = formData.get("front");
    const back = formData.get("back");
    if (!(front instanceof Blob) || !(back instanceof Blob)) {
      return noStore({ error: "Upload both the front and back of the licence" }, { status: 400 });
    }

    validateImageUploadMetadata(front);
    validateImageUploadMetadata(back);

    const [frontOriginal, backOriginal] = await Promise.all([
      front.arrayBuffer().then((value) => Buffer.from(value)),
      back.arrayBuffer().then((value) => Buffer.from(value)),
    ]);
    const [frontSafe, backSafe] = await Promise.all([
      sanitizeImage(frontOriginal, front.type),
      sanitizeImage(backOriginal, back.type),
    ]);
    const [frontOcr, backOcr] = await Promise.all([
      createOcrImage(frontSafe),
      createOcrImage(backSafe),
    ]);
    const [frontResult, backResult] = await readLicenceImages([frontOcr, backOcr]);
    const ocrConfidence = (frontResult.confidence + backResult.confidence) / 2;
    const analysis = analyzeAustralianLicense(frontResult.text, backResult.text, ocrConfidence);

    if (!analysis.isAustralianDriverLicense) {
      await writeAuditEvent({
        request,
        actorUserId: currentUser.id,
        action: "LICENCE_CLASSIFICATION_FAILED",
        targetType: "User",
        targetId: currentUser.id,
        metadata: { confidence: analysis.confidence },
      });
      return noStore({
        error: "These images could not be classified as an Australian driver licence.",
        code: "NOT_AUSTRALIAN_DRIVER_LICENCE",
        reasons: analysis.reasons,
      }, { status: 422 });
    }

    const uploadResults = await Promise.allSettled([
      uploadLicenceImage(frontSafe),
      uploadLicenceImage(backSafe),
    ]);
    if (uploadResults.some((result) => result.status === "rejected")) {
      await Promise.all(uploadResults.map((result) =>
        result.status === "fulfilled" ? deleteLicenceAsset(result.value.public_id) : Promise.resolve()
      ));
      const failed = uploadResults.find((result) => result.status === "rejected") as PromiseRejectedResult;
      throw failed.reason;
    }
    const [frontUpload, backUpload] = uploadResults.map(
      (result) => (result as PromiseFulfilledResult<UploadApiResponse>).value,
    );

    const frontUrl = `/api/files/license?asset=${encodeURIComponent(frontUpload.public_id)}`;
    try {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          licenseImage: frontUrl,
          licensePublicId: frontUpload.public_id,
          licenseBackPublicId: backUpload.public_id,
          licenseType: "AU_DRIVER_LICENCE",
          licenseStatus: "NEEDS_CONFIRMATION",
          licenseIssuerState: analysis.fields.issuerState,
          licenseClassificationConfidence: analysis.confidence,
          licenseVerificationSource: "GOOGLE_VISION_OCR_LOCAL_RULES",
          licenseOcrDataEncrypted: encryptLicenseValue(JSON.stringify(analysis.fields)),
          licenseExpiresAt: null,
          licenseExpiryDate: null,
          licenseHolderName: null,
          licenseDateOfBirth: null,
          licenseNumberEncrypted: null,
          licenseNumberLast4: null,
          licenseNumberHash: null,
          licenseCardEncrypted: null,
          licenseCardLast4: null,
          licenseNameMatches: null,
          licenseDobMatches: null,
          licenseVerifiedAt: null,
          licenseRejectionReason: null,
        },
        select: { id: true },
      });
    } catch (error) {
      await Promise.all([
        deleteLicenceAsset(frontUpload.public_id),
        deleteLicenceAsset(backUpload.public_id),
      ]);
      throw error;
    }

    await Promise.all([
      deleteLicenceAsset(currentUser.licensePublicId),
      deleteLicenceAsset(currentUser.licenseBackPublicId),
    ]);
    await writeAuditEvent({
      request,
      actorUserId: currentUser.id,
      action: "LICENCE_CLASSIFIED",
      targetType: "User",
      targetId: currentUser.id,
      metadata: { confidence: analysis.confidence, issuer: analysis.fields.issuerState },
    });

    return noStore({
      status: "NEEDS_CONFIRMATION",
      confidence: analysis.confidence,
      fields: analysis.fields,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return noStore({ error: error.message }, { status: error.status });
    }
    console.error("Licence analysis failed", error);
    const message = error instanceof Error && error.message === "Licence OCR is not configured"
      ? error.message
      : "The licence could not be analysed. Please try clearer images.";
    return noStore({ error: message }, { status: 500 });
  }
}

function validNamePart(value: unknown) {
  return typeof value === "string" &&
    value.trim().length >= 1 &&
    value.trim().length <= 100 &&
    /^[\p{L}\p{M}' -]+$/u.test(value.trim());
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return noStore({ error: "Authentication required" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        dateOfBirth: true,
        licenseStatus: true,
        licensePublicId: true,
        licenseBackPublicId: true,
        licenseIssuerState: true,
        licenseOcrDataEncrypted: true,
      },
    });
    if (!user) return noStore({ error: "User not found" }, { status: 404 });
    if (user.licenseStatus !== "NEEDS_CONFIRMATION" || !user.licensePublicId || !user.licenseBackPublicId || !user.licenseOcrDataEncrypted) {
      return noStore({ error: "Upload and analyse both sides of the licence first" }, { status: 409 });
    }

    const rateLimit = await consumeRateLimits([
      { scope: "licence-confirm-user", identifier: user.id, limit: 8, windowMs: 60 * 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const body = await request.json().catch(() => ({}));
    const givenNames = typeof body.givenNames === "string" ? body.givenNames.trim().replace(/\s+/g, " ") : "";
    const familyName = typeof body.familyName === "string" ? body.familyName.trim().replace(/\s+/g, " ") : "";
    const dateOfBirth = typeof body.dateOfBirth === "string" ? body.dateOfBirth : "";
    const expiryDate = typeof body.expiryDate === "string" ? body.expiryDate : "";
    const licenseNumber = normalizeDocumentNumber(typeof body.licenseNumber === "string" ? body.licenseNumber : "");
    const cardNumber = normalizeDocumentNumber(typeof body.cardNumber === "string" ? body.cardNumber : "");
    const issuerState = typeof body.issuerState === "string" ? body.issuerState.toUpperCase() : "";

    const ocrFields = JSON.parse(decryptLicenseValue(user.licenseOcrDataEncrypted)) as {
      givenNames: string;
      familyName: string;
      dateOfBirth: string;
      expiryDate: string;
      licenseNumber: string;
      cardNumber: string;
      issuerState: string;
    };
    const normalizeNameForComparison = (value: string) => value.normalize("NFKC").toUpperCase().replace(/\s+/g, " ").trim();
    const agreesWithOcr =
      normalizeNameForComparison(givenNames) === normalizeNameForComparison(ocrFields.givenNames) &&
      normalizeNameForComparison(familyName) === normalizeNameForComparison(ocrFields.familyName) &&
      dateOfBirth === ocrFields.dateOfBirth &&
      expiryDate === ocrFields.expiryDate &&
      licenseNumber === normalizeDocumentNumber(ocrFields.licenseNumber) &&
      cardNumber === normalizeDocumentNumber(ocrFields.cardNumber) &&
      issuerState === ocrFields.issuerState;
    if (!agreesWithOcr) {
      return noStore({ error: "The confirmed values must match the text read from the licence. Retake clearer photos if a value was read incorrectly." }, { status: 400 });
    }

    if (!validNamePart(givenNames) || !validNamePart(familyName)) {
      return noStore({ error: "Enter the legal given and family names shown on the licence" }, { status: 400 });
    }
    if (!isValidLicenseDate(dateOfBirth) || !isValidLicenseDate(expiryDate)) {
      return noStore({ error: "Enter valid birth and expiry dates" }, { status: 400 });
    }
    if (!AU_ISSUERS.includes(issuerState as AustralianIssuer) || issuerState !== user.licenseIssuerState) {
      return noStore({ error: "The issuing state must match the analysed licence" }, { status: 400 });
    }
    if (licenseNumber.length < 4 || cardNumber.length < 4) {
      return noStore({ error: "Enter the licence number and card number shown on the document" }, { status: 400 });
    }

    const issuer = issuerState as AustralianIssuer;
    const nameMatches = licenseNameMatchesProfile(user.name || "", givenNames, familyName);
    const dobMatches = Boolean(user.dateOfBirth && user.dateOfBirth === dateOfBirth);
    const expired = expiryDate < todayForIssuer(issuer);
    const numberHash = hashLicenseValue(`${issuer}|${licenseNumber}`);
    const duplicate = await prisma.user.findFirst({
      where: {
        id: { not: user.id },
        licenseNumberHash: numberHash,
        licenseStatus: "VERIFIED",
      },
      select: { id: true },
    });

    const status = expired
      ? "EXPIRED"
      : nameMatches && dobMatches && !duplicate
        ? "VERIFIED"
        : "DETAILS_MISMATCH";
    const reason = expired
      ? "The licence expiry date has passed."
      : duplicate
        ? "These licence details are already associated with another account."
        : !nameMatches && !dobMatches
          ? "The licence name and date of birth do not match the Redrive profile."
          : !nameMatches
            ? "The licence name does not match the Redrive profile."
            : !dobMatches
              ? "The licence date of birth does not match the Redrive profile."
              : null;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        licenseStatus: status,
        licenseExpiryDate: expiryDate,
        licenseExpiresAt: licenseExpiryInstant(expiryDate, issuer),
        licenseIssuerState: issuer,
        licenseHolderName: `${givenNames} ${familyName}`,
        licenseDateOfBirth: dateOfBirth,
        licenseNumberEncrypted: encryptLicenseValue(licenseNumber),
        licenseNumberLast4: lastFour(licenseNumber),
        licenseNumberHash: numberHash,
        licenseCardEncrypted: encryptLicenseValue(cardNumber),
        licenseCardLast4: lastFour(cardNumber),
        licenseOcrDataEncrypted: null,
        licenseNameMatches: nameMatches,
        licenseDobMatches: dobMatches,
        licenseVerifiedAt: status === "VERIFIED" ? new Date() : null,
        licenseReviewedAt: new Date(),
        licenseRejectionReason: reason,
      },
      select: {
        licenseStatus: true,
        licenseExpiryDate: true,
        licenseIssuerState: true,
        licenseHolderName: true,
        licenseNumberLast4: true,
        licenseCardLast4: true,
        licenseNameMatches: true,
        licenseDobMatches: true,
        licenseVerifiedAt: true,
        licenseRejectionReason: true,
      },
    });

    await writeAuditEvent({
      request,
      actorUserId: user.id,
      action: `LICENCE_${status}`,
      targetType: "User",
      targetId: user.id,
      reason,
      metadata: { issuer, nameMatches, dobMatches, expired, duplicate: Boolean(duplicate) },
    });

    return noStore({
      ...updated,
      licenseVerifiedAt: updated.licenseVerifiedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Licence confirmation failed", error);
    return noStore({ error: "The licence details could not be saved" }, { status: 500 });
  }
}
