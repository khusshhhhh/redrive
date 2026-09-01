import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import prisma from "@/app/libs/prismadb";
import { analyzeAustralianLicense } from "@/app/libs/licenseDocument";
import { LicenceOcrError, readLicenceImages } from "@/app/libs/googleVision";
import {
  UploadValidationError,
  createOcrImage,
  imageTypeForUpload,
  sanitizeImage,
  validateImageUploadMetadata,
} from "@/app/libs/uploadSecurity";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class DriverLicenceUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function uploadBuffer(buffer: Buffer) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "redrive/reservation-licences",
        resource_type: "image",
        type: "authenticated",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => (error || !result ? reject(error ?? new Error("no upload result")) : resolve(result)),
    );
    stream.end(buffer);
  });
}

async function toSafeBuffer(file: File): Promise<Buffer> {
  validateImageUploadMetadata(file);
  const type = imageTypeForUpload(file);
  const raw = Buffer.from(await file.arrayBuffer());
  return sanitizeImage(raw, type);
}

export interface DriverLicenceUploadResult {
  frontPublicId: string;
  backPublicId: string | null;
  looksAustralian: boolean;
  detectedState: string | null;
  reason: string | null;
}

/**
 * Sanitise + OCR + store a driver-licence photo pair, and stash the outcome in a
 * short-lived LicenceCheck so a later booking submit can trust it (not the
 * client). Shared by the web and mobile upload routes.
 */
export async function processDriverLicenceUpload(input: {
  userId: string;
  front: File;
  back?: File | null;
}): Promise<DriverLicenceUploadResult> {
  let frontSafe: Buffer;
  let backSafe: Buffer | null = null;
  try {
    frontSafe = await toSafeBuffer(input.front);
    if (input.back instanceof File && input.back.size > 0) {
      backSafe = await toSafeBuffer(input.back);
    }
  } catch (error) {
    if (error instanceof UploadValidationError) {
      throw new DriverLicenceUploadError(error.message, 400);
    }
    throw new DriverLicenceUploadError("That image could not be processed", 400);
  }

  // Analyse — best effort. If OCR isn't configured or fails, accept the upload
  // and let the host see the image; just don't claim it was auto-checked.
  let looksAustralian = false;
  let detectedState: string | null = null;
  let reason: string | null = null;
  try {
    const ocrImages = [await createOcrImage(frontSafe)];
    if (backSafe) ocrImages.push(await createOcrImage(backSafe));
    const results = await readLicenceImages(ocrImages);
    const analysis = analyzeAustralianLicense(
      results[0]?.text || "",
      results[1]?.text || "",
      results[0]?.confidence || 0,
    );
    looksAustralian = analysis.isAustralianDriverLicense;
    detectedState = analysis.fields.issuerState || null;
    if (!looksAustralian) {
      reason = detectedState
        ? `This looks like a ${detectedState} licence but some of the card couldn't be read — retake it in even light, filling the frame.`
        : "This didn't read as an Australian driver licence. Photograph the front of the card, filling the frame, with no glare.";
    }
  } catch (error) {
    if (error instanceof LicenceOcrError || (error instanceof Error && error.message === "Licence OCR is not configured")) {
      looksAustralian = true; // don't block a booking on our OCR being down
      reason = "not-checked";
    } else {
      console.error("Driver licence analysis failed", error);
      throw new DriverLicenceUploadError("The licence could not be checked right now", 503);
    }
  }

  const [frontUpload, backUpload] = await Promise.all([
    uploadBuffer(frontSafe),
    backSafe ? uploadBuffer(backSafe) : Promise.resolve(null),
  ]).catch((error) => {
    console.error("Licence upload failed", error);
    throw new DriverLicenceUploadError("The licence image could not be stored", 502);
  });

  await prisma.licenceCheck.deleteMany({
    where: { ownerUserId: input.userId, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
  await prisma.licenceCheck.create({
    data: {
      ownerUserId: input.userId,
      frontPublicId: frontUpload.public_id,
      backPublicId: backUpload?.public_id ?? null,
      looksAustralian,
      detectedState,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  });

  return {
    frontPublicId: frontUpload.public_id,
    backPublicId: backUpload?.public_id ?? null,
    looksAustralian,
    detectedState,
    reason,
  };
}
