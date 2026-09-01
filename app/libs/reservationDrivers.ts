import prisma from "@/app/libs/prismadb";
import { resolvePrimaryLicenceFromFile } from "@/app/libs/licenceReuse";

export interface DriverInput {
  role?: unknown;
  name?: unknown;
  frontPublicId?: unknown;
  useOnFile?: unknown;
}

export interface ReservationDriverRow {
  role: string;
  name: string;
  licenceImagePublicId: string;
  licenceBackImagePublicId: string | null;
  looksAustralian: boolean;
  detectedState: string | null;
}

export interface DriverResolution {
  ok: boolean;
  rows?: ReservationDriverRow[];
  status?: number;
  code?: string;
  error?: string;
}

const DRIVER_REQUIRED: DriverResolution = {
  ok: false,
  status: 400,
  code: "DRIVER_LICENCE_REQUIRED",
  error: "Add the primary driver's name and a photo of their licence.",
};

/**
 * Turn the client's `drivers` array into trusted ReservationDriver rows. The
 * primary driver can reuse a licence on file (`useOnFile`); every uploaded
 * licence is validated against the short-lived LicenceCheck the upload route
 * stored, never the client's claim. Shared by the web and mobile create routes.
 */
export async function resolveReservationDriverRows(
  userId: string,
  driverInputs: DriverInput[],
): Promise<DriverResolution> {
  const primaryInput = driverInputs.find((d) => d.role === "PRIMARY");
  const secondaryInput = driverInputs.find((d) => d.role === "SECONDARY");
  const primaryUsesFile = primaryInput?.useOnFile === true;

  if (
    !primaryInput ||
    typeof primaryInput.name !== "string" ||
    primaryInput.name.trim().length < 2 ||
    (!primaryUsesFile && typeof primaryInput.frontPublicId !== "string")
  ) {
    return DRIVER_REQUIRED;
  }

  const wantedPublicIds = [
    primaryUsesFile ? undefined : primaryInput.frontPublicId,
    secondaryInput?.frontPublicId,
  ].filter((value): value is string => typeof value === "string");
  const checks = wantedPublicIds.length
    ? await prisma.licenceCheck.findMany({
        where: { frontPublicId: { in: wantedPublicIds }, ownerUserId: userId, expiresAt: { gt: new Date() } },
      })
    : [];
  const checkFor = (publicId?: string) => checks.find((c) => c.frontPublicId === publicId);

  let primaryRow: ReservationDriverRow;
  if (primaryUsesFile) {
    const resolved = await resolvePrimaryLicenceFromFile(userId, primaryInput.name);
    if (!resolved) {
      return {
        ok: false,
        status: 400,
        code: "DRIVER_LICENCE_REQUIRED",
        error: "We couldn't reuse a licence on file — upload a photo of the primary driver's licence.",
      };
    }
    primaryRow = { role: "PRIMARY", ...resolved };
  } else {
    const primaryCheck = checkFor(primaryInput.frontPublicId as string);
    if (!primaryCheck || !primaryCheck.looksAustralian) {
      return {
        ok: false,
        status: 400,
        code: "DRIVER_LICENCE_REQUIRED",
        error:
          "Re-upload the primary driver's licence — it didn't pass the Australian licence check or the upload has expired.",
      };
    }
    primaryRow = {
      role: "PRIMARY",
      name: primaryInput.name.trim().slice(0, 120),
      licenceImagePublicId: primaryCheck.frontPublicId,
      licenceBackImagePublicId: primaryCheck.backPublicId,
      looksAustralian: primaryCheck.looksAustralian,
      detectedState: primaryCheck.detectedState,
    };
  }

  const secondaryCheck =
    secondaryInput && typeof secondaryInput.name === "string" && secondaryInput.name.trim().length >= 2
      ? checkFor(typeof secondaryInput.frontPublicId === "string" ? secondaryInput.frontPublicId : undefined)
      : undefined;
  if (secondaryInput && !secondaryCheck) {
    return {
      ok: false,
      status: 400,
      code: "DRIVER_LICENCE_REQUIRED",
      error: "The second driver needs a name and a valid Australian licence photo, or remove them.",
    };
  }

  const rows: ReservationDriverRow[] = [primaryRow];
  if (secondaryCheck && secondaryInput) {
    rows.push({
      role: "SECONDARY",
      name: (secondaryInput.name as string).trim().slice(0, 120),
      licenceImagePublicId: secondaryCheck.frontPublicId,
      licenceBackImagePublicId: secondaryCheck.backPublicId,
      looksAustralian: secondaryCheck.looksAustralian,
      detectedState: secondaryCheck.detectedState,
    });
  }
  return { ok: true, rows };
}
