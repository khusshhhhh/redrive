import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import getCurrentUser from "@/app/actions/getCurrentUser";
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
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function upload(buffer: Buffer) {
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

async function POSTHandler(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await consumeRateLimits([
    { scope: "driver-licence-user", identifier: currentUser.id, limit: 20, windowMs: 60 * 60_000 },
    { scope: "driver-licence-ip", identifier: getClientIp(request), limit: 40, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload the licence as form data" }, { status: 400 });
  }
  const front = form.get("front");
  const back = form.get("back");
  if (!(front instanceof File)) {
    return NextResponse.json({ error: "A photo of the front of the licence is required" }, { status: 400 });
  }

  let frontSafe: Buffer;
  let backSafe: Buffer | null = null;
  try {
    frontSafe = await toSafeBuffer(front);
    if (back instanceof File && back.size > 0) backSafe = await toSafeBuffer(back);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "That image could not be processed" }, { status: 400 });
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
      return NextResponse.json({ error: "The licence could not be checked right now" }, { status: 503 });
    }
  }

  const [frontUpload, backUpload] = await Promise.all([
    upload(frontSafe),
    backSafe ? upload(backSafe) : Promise.resolve(null),
  ]).catch((error) => {
    console.error("Licence upload failed", error);
    throw error;
  });

  await prisma.licenceCheck.deleteMany({
    where: { ownerUserId: currentUser.id, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
  await prisma.licenceCheck.create({
    data: {
      ownerUserId: currentUser.id,
      frontPublicId: frontUpload.public_id,
      backPublicId: backUpload?.public_id ?? null,
      looksAustralian,
      detectedState,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  });

  return NextResponse.json(
    {
      frontPublicId: frontUpload.public_id,
      backPublicId: backUpload?.public_id ?? null,
      looksAustralian,
      detectedState,
      reason,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = monitorApiRoute("/api/reservations/driver-licence", POSTHandler, "POST");
