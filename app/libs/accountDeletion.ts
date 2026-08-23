import { v2 as cloudinary } from "cloudinary";
import { Prisma } from "@prisma/client";

import prisma from "@/app/libs/prismadb";
import { securityHash } from "@/app/libs/security";
import { getStripe } from "@/app/libs/stripe";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ACTIVE_RESERVATION_STATUSES = ["REVIEWING", "APPROVED", "ACTIVE"];
const UNSETTLED_PAYMENT_STATUSES = ["CHECKOUT_PENDING", "PAID_HELD"];
const OPEN_INCIDENT_STATUSES = ["OPEN", "UNDER_REVIEW"];

type DeletionUser = {
  id: string;
  email: string | null;
  image: string | null;
  licenseImage: string | null;
  licensePublicId: string | null;
  licenseBackPublicId: string | null;
  stripeConnectedAccountId: string | null;
};

function reservationScope(userId: string, listingIds: string[]): Prisma.ReservationWhereInput {
  return {
    OR: [
      { userId },
      ...(listingIds.length ? [{ listingId: { in: listingIds } }] : []),
    ],
  };
}

export async function getAccountDeletionBlocker(userId: string) {
  const listings = await prisma.listing.findMany({ where: { userId }, select: { id: true } });
  const listingIds = listings.map((listing) => listing.id);
  const scopedReservation = reservationScope(userId, listingIds);

  const activeReservation = await prisma.reservation.findFirst({
    where: { AND: [scopedReservation, { status: { in: ACTIVE_RESERVATION_STATUSES } }] },
    select: { id: true },
  });
  if (activeReservation) {
    return "Resolve or cancel every active booking request and trip before deleting your account.";
  }

  const reservationIds = (await prisma.reservation.findMany({
    where: scopedReservation,
    select: { id: true },
  })).map((reservation) => reservation.id);

  const unsettledPayment = await prisma.payment.findFirst({
    where: {
      status: { in: UNSETTLED_PAYMENT_STATUSES },
      OR: [
        { renterId: userId },
        { ownerId: userId },
        ...(reservationIds.length ? [{ reservationId: { in: reservationIds } }] : []),
      ],
    },
    select: { id: true },
  });
  if (unsettledPayment) {
    return "A payment or payout is still being processed. Finish that transaction before deleting your account.";
  }

  const openIncident = reservationIds.length
    ? await prisma.incidentCase.findFirst({
        where: { reservationId: { in: reservationIds }, status: { in: OPEN_INCIDENT_STATUSES } },
        select: { id: true },
      })
    : null;
  if (openIncident) {
    return "An incident linked to your account is still open. It must be resolved before account deletion.";
  }

  return null;
}

export function publicIdFromUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, "https://redrive.invalid");
    const asset = url.searchParams.get("asset");
    if (asset?.startsWith("redrive/")) return asset;
    if (url.hostname !== "res.cloudinary.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const redriveIndex = parts.indexOf("redrive");
    if (redriveIndex < 0) return null;
    const publicId = parts.slice(redriveIndex).join("/").replace(/\.[a-z0-9]+$/i, "");
    return publicId.startsWith("redrive/") ? publicId : null;
  } catch {
    return null;
  }
}

async function removeCloudinaryAssets(publicIds: string[]) {
  const ids = [...new Set(publicIds.filter((id) => id.startsWith("redrive/")))];
  if (!ids.length) return;
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Media deletion is temporarily unavailable");
  }

  const results = await Promise.allSettled(ids.map((publicId) =>
    cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      type: publicId.startsWith("redrive/licenses/") || publicId.startsWith("redrive/handovers/")
        ? "authenticated"
        : "upload",
      invalidate: true,
    })
  ));
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("Some stored media could not be removed");
  }
}

function jsonContainsIdentifier(value: unknown, identifiers: Set<string>): boolean {
  if (typeof value === "string") return identifiers.has(value);
  if (Array.isArray(value)) return value.some((item) => jsonContainsIdentifier(item, identifiers));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => jsonContainsIdentifier(item, identifiers));
  }
  return false;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  }
  return [];
}

export async function permanentlyDeleteAccount(user: DeletionUser) {
  const listings = await prisma.listing.findMany({
    where: { userId: user.id },
    select: { id: true, imageSrcs: true, regoImage: true },
  });
  const listingIds = listings.map((listing) => listing.id);
  const reservations = await prisma.reservation.findMany({
    where: reservationScope(user.id, listingIds),
    select: { id: true },
  });
  const reservationIds = reservations.map((reservation) => reservation.id);
  const incidentCases = await prisma.incidentCase.findMany({
    where: {
      OR: [
        { reporterUserId: user.id },
        ...(reservationIds.length ? [{ reservationId: { in: reservationIds } }] : []),
      ],
    },
    select: { id: true, evidence: true },
  });
  const chats = await prisma.chat.findMany({
    where: { participantIds: { has: user.id } },
    select: { id: true },
  });
  const chatIds = chats.map((chat) => chat.id);
  const reports = reservationIds.length
    ? await prisma.handoverReport.findMany({ where: { reservationId: { in: reservationIds } }, select: { id: true } })
    : [];
  const reportIds = reports.map((report) => report.id);
  const handoverMedia = reportIds.length
    ? await prisma.handoverMedia.findMany({ where: { reportId: { in: reportIds } }, select: { publicId: true, url: true } })
    : [];
  const messageMedia = chatIds.length
    ? await prisma.message.findMany({ where: { chatId: { in: chatIds } }, select: { imageUrl: true } })
    : [];

  await removeCloudinaryAssets([
    user.licensePublicId || "",
    user.licenseBackPublicId || "",
    publicIdFromUrl(user.licenseImage) || "",
    publicIdFromUrl(user.image) || "",
    ...listings.flatMap((listing) => [
      ...listing.imageSrcs.map((url) => publicIdFromUrl(url) || ""),
      publicIdFromUrl(listing.regoImage) || "",
    ]),
    ...handoverMedia.flatMap((media) => [media.publicId || "", publicIdFromUrl(media.url) || ""]),
    ...messageMedia.map((message) => publicIdFromUrl(message.imageUrl) || ""),
    ...incidentCases.flatMap((incident) => collectStrings(incident.evidence).map((value) => publicIdFromUrl(value) || "")),
  ]);

  if (user.stripeConnectedAccountId) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("Payout account deletion is temporarily unavailable");
    await getStripe().v2.core.accounts.close(user.stripeConnectedAccountId, {
      applied_configurations: ["recipient"],
    });
    // Checkpoint the irreversible provider-side action so a later database
    // failure can be retried without attempting to close the account twice.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeConnectedAccountId: null,
        stripeDetailsSubmitted: false,
        stripePayoutsEnabled: false,
      },
    });
  }

  const identifiers = new Set([
    user.id,
    ...listingIds,
    ...reservationIds,
    ...chatIds,
    ...reportIds,
    ...incidentCases.map((incident) => incident.id),
  ]);
  const [favouriteOwners, featureFlags, possibleNotifications] = await Promise.all([
    listingIds.length
      ? prisma.user.findMany({ where: { favoriteIds: { hasSome: listingIds } }, select: { id: true, favoriteIds: true } })
      : [],
    prisma.featureFlag.findMany({ where: { allowedUserIds: { has: user.id } }, select: { id: true, allowedUserIds: true } }),
    prisma.notification.findMany({ select: { id: true, data: true, actionUrl: true } }),
  ]);
  const relatedNotificationIds = possibleNotifications
    .filter((notification) =>
      jsonContainsIdentifier(notification.data, identifiers) ||
      [...identifiers].some((identifier) => notification.actionUrl?.includes(identifier))
    )
    .map((notification) => notification.id);

  await prisma.$transaction(async (tx) => {
    for (const owner of favouriteOwners) {
      await tx.user.update({
        where: { id: owner.id },
        data: { favoriteIds: { set: owner.favoriteIds.filter((id) => !listingIds.includes(id)) } },
      });
    }
    for (const flag of featureFlags) {
      await tx.featureFlag.update({
        where: { id: flag.id },
        data: { allowedUserIds: { set: flag.allowedUserIds.filter((id) => id !== user.id) } },
      });
    }

    await tx.user.updateMany({ where: { licenseReviewedBy: user.id }, data: { licenseReviewedBy: null } });
    if (reportIds.length) await tx.handoverMedia.deleteMany({ where: { reportId: { in: reportIds } } });
    if (reservationIds.length) {
      await tx.handoverReport.deleteMany({ where: { reservationId: { in: reservationIds } } });
      await tx.incidentCase.deleteMany({ where: { OR: [{ reservationId: { in: reservationIds } }, { reporterUserId: user.id }] } });
    } else {
      await tx.incidentCase.deleteMany({ where: { reporterUserId: user.id } });
    }
    if (listingIds.length) {
      await tx.availabilityBlock.deleteMany({ where: { listingId: { in: listingIds } } });
      await tx.maintenanceRecord.deleteMany({ where: { listingId: { in: listingIds } } });
    }
    await tx.bookingQuote.deleteMany({
      where: {
        OR: [
          { userId: user.id },
          ...(listingIds.length ? [{ listingId: { in: listingIds } }] : []),
          ...(reservationIds.length ? [{ reservationId: { in: reservationIds } }] : []),
        ],
      },
    });
    await tx.payment.deleteMany({
      where: {
        OR: [
          { renterId: user.id },
          { ownerId: user.id },
          ...(reservationIds.length ? [{ reservationId: { in: reservationIds } }] : []),
        ],
      },
    });
    await tx.review.deleteMany({
      where: { OR: [{ userId: user.id }, ...(listingIds.length ? [{ listingId: { in: listingIds } }] : [])] },
    });
    if (reservationIds.length) await tx.reservation.deleteMany({ where: { id: { in: reservationIds } } });
    if (listingIds.length) await tx.listing.deleteMany({ where: { id: { in: listingIds } } });
    if (chatIds.length) {
      await tx.message.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.chat.deleteMany({ where: { id: { in: chatIds } } });
    }
    await tx.message.deleteMany({ where: { senderId: user.id } });
    await tx.notification.deleteMany({
      where: { OR: [{ userId: user.id }, ...(relatedNotificationIds.length ? [{ id: { in: relatedNotificationIds } }] : [])] },
    });
    await tx.savedSearch.deleteMany({ where: { userId: user.id } });
    await tx.userSession.deleteMany({ where: { userId: user.id } });
    await tx.webAuthnCredential.deleteMany({ where: { userId: user.id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await tx.account.deleteMany({ where: { userId: user.id } });
    await tx.auditEvent.deleteMany({
      where: {
        OR: [
          { actorUserId: user.id },
          { targetId: { in: [...identifiers] } },
        ],
      },
    });
    await tx.rateLimitBucket.deleteMany({
      where: {
        OR: [
          { key: { contains: securityHash(user.id) } },
          ...(user.email ? [{ key: { contains: securityHash(user.email) } }] : []),
        ],
      },
    });
    await tx.user.delete({ where: { id: user.id } });
  });

  await prisma.auditEvent.create({
    data: {
      action: "ACCOUNT_DELETED",
      targetType: "DeletedAccount",
      metadata: { deletionReference: securityHash(user.id).slice(0, 24) },
    },
  }).catch((error) => console.error("Account deletion audit write failed", error));
}
