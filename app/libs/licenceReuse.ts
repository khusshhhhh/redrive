import { v2 as cloudinary } from "cloudinary";

import prisma from "@/app/libs/prismadb";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type ReusableLicenceSource = "PROFILE" | "PREVIOUS_TRIP";

export interface ReusableLicence {
  source: ReusableLicenceSource;
  name: string | null;
  detectedState: string | null;
  /** Only present for PREVIOUS_TRIP (already a reservation-licence asset). */
  frontPublicId: string;
  backPublicId: string | null;
}

/**
 * A licence a returning guest can reuse for the primary driver instead of
 * re-photographing it:
 *   1. a VERIFIED licence on their profile (strongest — name + DOB matched), or
 *   2. the licence from a previous COMPLETED trip (needs ≥1 completed trip).
 * Returns null when neither applies.
 */
export async function getReusableLicence(userId: string): Promise<ReusableLicence | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      licenseStatus: true,
      licensePublicId: true,
      licenseBackPublicId: true,
      licenseIssuerState: true,
      licenseHolderName: true,
      licenseExpiresAt: true,
    },
  });

  const profileLicenceCurrent =
    user?.licenseStatus === "VERIFIED" &&
    !!user.licensePublicId &&
    (!user.licenseExpiresAt || user.licenseExpiresAt.getTime() > Date.now());

  if (profileLicenceCurrent) {
    return {
      source: "PROFILE",
      name: user!.licenseHolderName || user!.name || null,
      detectedState: user!.licenseIssuerState || null,
      frontPublicId: user!.licensePublicId!,
      backPublicId: user!.licenseBackPublicId || null,
    };
  }

  const completedTrips = await prisma.reservation.count({
    where: { userId, status: "COMPLETED" },
  });
  if (completedTrips < 1) return null;

  const prior = await prisma.reservationDriver.findFirst({
    where: {
      role: "PRIMARY",
      looksAustralian: true,
      reservation: { userId, status: "COMPLETED" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      licenceImagePublicId: true,
      licenceBackImagePublicId: true,
      detectedState: true,
    },
  });
  if (!prior) return null;

  return {
    source: "PREVIOUS_TRIP",
    name: prior.name,
    detectedState: prior.detectedState || null,
    frontPublicId: prior.licenceImagePublicId,
    backPublicId: prior.licenceBackImagePublicId || null,
  };
}

/** Copy an authenticated Cloudinary asset into the reservation-licences folder
 *  so the booking's licence proxy (which only serves that folder) can sign it. */
async function copyToReservationFolder(sourcePublicId: string): Promise<string> {
  const signedSource = cloudinary.url(sourcePublicId, {
    type: "authenticated",
    secure: true,
    sign_url: true,
    resource_type: "image",
  });
  const result = await cloudinary.uploader.upload(signedSource, {
    folder: "redrive/reservation-licences",
    resource_type: "image",
    type: "authenticated",
  });
  return result.public_id;
}

export interface ResolvedDriverLicence {
  name: string;
  licenceImagePublicId: string;
  licenceBackImagePublicId: string | null;
  looksAustralian: boolean;
  detectedState: string | null;
}

/**
 * Turn a reusable licence into a ready-to-insert ReservationDriver row for the
 * primary driver. For a PROFILE licence the asset is copied into the
 * reservation-licences folder; a PREVIOUS_TRIP asset is already there.
 */
export async function resolvePrimaryLicenceFromFile(
  userId: string,
  providedName?: string,
): Promise<ResolvedDriverLicence | null> {
  const reusable = await getReusableLicence(userId);
  if (!reusable) return null;

  const name = (providedName || reusable.name || "").trim().slice(0, 120);
  if (name.length < 2) return null;

  if (reusable.source === "PREVIOUS_TRIP") {
    return {
      name,
      licenceImagePublicId: reusable.frontPublicId,
      licenceBackImagePublicId: reusable.backPublicId,
      looksAustralian: true,
      detectedState: reusable.detectedState,
    };
  }

  try {
    const front = await copyToReservationFolder(reusable.frontPublicId);
    const back = reusable.backPublicId
      ? await copyToReservationFolder(reusable.backPublicId).catch(() => null)
      : null;
    return {
      name,
      licenceImagePublicId: front,
      licenceBackImagePublicId: back,
      looksAustralian: true,
      detectedState: reusable.detectedState,
    };
  } catch (error) {
    console.error("Profile licence copy failed", userId, error);
    return null;
  }
}
