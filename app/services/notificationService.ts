import prisma from "@/app/libs/prismadb";
import { NotificationType } from "@/app/types";
import { Prisma } from "@prisma/client";

import {
  dispatchNotification,
  type DispatchInput,
} from "@/app/libs/notifications/dispatch";
import {
  formatDateRange,
  formatHandoverMoment,
  formatMoney,
  loadReservationCard,
  tripFacts,
} from "@/app/libs/notifications/templates";
import { formatTimeOfDay, type HandoverKind } from "@/app/libs/bookingTimes";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
  actionUrl?: string;
  expiresAt?: Date;
  /** Cross-run de-dupe base for email/push/sms. */
  dedupeKey?: string;
  email?: DispatchInput["email"];
  sms?: DispatchInput["sms"];
  forceSms?: boolean;
  skipInApp?: boolean;
  inAppOnly?: boolean;
}

/**
 * The one place notifications are created. Every method fans out to in-app +
 * email + push (+ SMS for a few time-critical events) via `dispatchNotification`,
 * governed by the recipient's notification preferences.
 */
class NotificationService {
  async createNotification(params: CreateNotificationParams) {
    try {
      return await dispatchNotification({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data,
        actionUrl: params.actionUrl,
        expiresAt: params.expiresAt,
        dedupeKey: params.dedupeKey,
        email: params.email,
        sms: params.sms,
        forceSms: params.forceSms,
        skipInApp: params.skipInApp,
        inAppOnly: params.inAppOnly,
      });
    } catch (error) {
      console.error("Error dispatching notification:", error);
      return { inApp: false, email: false, push: false, sms: false };
    }
  }

  async createMultipleNotifications(notifications: CreateNotificationParams[]) {
    let sent = 0;
    for (const notification of notifications) {
      const result = await this.createNotification(notification);
      if (result.inApp) sent += 1;
    }
    return { count: sent };
  }

  // ---------------------------------------------------------------- bookings

  async notifyBookingRequest(
    listingOwnerId: string,
    bookerName: string,
    listingTitle: string,
    reservationId: string,
    /** Set for the follow-up "still waiting" nudges so each one is distinct. */
    nudgeTag?: string,
  ) {
    const card = await loadReservationCard(reservationId);
    const pending = Boolean(nudgeTag);
    return this.createNotification({
      userId: listingOwnerId,
      type: NotificationType.BOOKING_REQUEST,
      title: pending ? "A booking request is still waiting" : "New booking request",
      message: pending
        ? `${bookerName} is still waiting on your answer for ${listingTitle}. Requests auto-decline after 48 hours.`
        : `${bookerName} has requested to book your ${listingTitle}`,
      data: { reservationId, bookerName, listingTitle },
      actionUrl: `/reservations`,
      dedupeKey: `res:${reservationId}:request${nudgeTag ? `:${nudgeTag}` : ""}`,
      email: {
        subject: `${bookerName} wants to book your ${listingTitle}`,
        content: {
          preheader: `A new request${card ? ` for ${formatDateRange(card.startDate, card.endDate)}` : ""} is waiting for your response.`,
          eyebrow: "Booking request",
          title: "You have a new request",
          paragraphs: [
            `<strong>${bookerName}</strong> would like to book your <strong>${listingTitle}</strong>. Requests are held for 48 hours — reply while it's fresh so the guest doesn't book elsewhere.`,
            card
              ? `Approving is free; you'll be asked to confirm your payout account if it isn't set up yet. The guest is only charged once you approve.`
              : `The guest is only charged once you approve.`,
          ],
          facts: card ? tripFacts(card, { includeTimes: true }) : undefined,
          primaryButton: { label: "Review the request", url: `${origin()}/reservations` },
        },
      },
    });
  }

  async notifyBookingApproved(
    bookerId: string,
    listingTitle: string,
    reservationId: string,
  ) {
    const card = await loadReservationCard(reservationId);
    return this.createNotification({
      userId: bookerId,
      type: NotificationType.BOOKING_APPROVED,
      title: "Booking approved",
      message: `Your booking for ${listingTitle} has been approved — pay within 48 hours to lock it in`,
      data: { reservationId, listingTitle },
      actionUrl: `/reservations/${reservationId}?pay=1`,
      dedupeKey: `res:${reservationId}:approved`,
      email: {
        subject: `Approved — pay to confirm your ${listingTitle} booking`,
        content: {
          preheader: "Your request was approved. Pay within 48 hours to confirm the trip.",
          eyebrow: "Booking approved",
          title: "You're approved — one step left",
          paragraphs: [
            `The host approved your booking for <strong>${listingTitle}</strong>. To confirm the trip, complete payment within <strong>48 hours</strong>. After that the dates are released.`,
            `Your card is charged now and the funds are held securely by Redrive until the return handover is agreed.`,
          ],
          facts: card
            ? [...tripFacts(card, { includeTimes: true }), { label: "Total", value: formatMoney(card.totalFees) }]
            : undefined,
          primaryButton: { label: "Pay & confirm", url: `${origin()}/reservations/${reservationId}?pay=1` },
          footnote: card?.cancellationSummary ?? undefined,
        },
      },
    });
  }

  async notifyBookingDeclined(
    bookerId: string,
    listingTitle: string,
    reservationId: string,
  ) {
    return this.createNotification({
      userId: bookerId,
      type: NotificationType.BOOKING_DECLINED,
      title: "Booking declined",
      message: `Your booking request for ${listingTitle} was declined`,
      data: { reservationId, listingTitle },
      actionUrl: `/`,
      dedupeKey: `res:${reservationId}:declined`,
      email: {
        subject: `Your ${listingTitle} request wasn't accepted`,
        content: {
          preheader: "The host couldn't take this booking. Similar vehicles are available.",
          eyebrow: "Booking update",
          title: "That one didn't work out",
          paragraphs: [
            `The host wasn't able to accept your request for <strong>${listingTitle}</strong>. No charge was made.`,
            `Plenty of other vehicles are available for your dates — a quick search will usually turn up a close match nearby.`,
          ],
          primaryButton: { label: "Find another vehicle", url: `${origin()}/` },
        },
      },
    });
  }

  async notifyBookingCancelled(
    userId: string,
    listingTitle: string,
    reservationId: string,
    cancelledBy: string,
  ) {
    const card = await loadReservationCard(reservationId);
    return this.createNotification({
      userId,
      type: NotificationType.BOOKING_CANCELLED,
      title: "Booking cancelled",
      message: `The booking for ${listingTitle} was cancelled by ${cancelledBy}`,
      data: { reservationId, listingTitle, cancelledBy },
      actionUrl: `/reservations/${reservationId}`,
      dedupeKey: `res:${reservationId}:cancelled:${userId}`,
      email: {
        subject: `Booking cancelled — ${listingTitle}`,
        content: {
          preheader: `This trip was cancelled by ${cancelledBy}.`,
          eyebrow: "Booking cancelled",
          title: "This booking was cancelled",
          paragraphs: [
            `The booking for <strong>${listingTitle}</strong> was cancelled by ${cancelledBy}. Any refund due under the cancellation policy has been started and will appear on the original payment method.`,
          ],
          facts: card ? tripFacts(card) : undefined,
          primaryButton: { label: "View the booking", url: `${origin()}/reservations/${reservationId}` },
          footnote: card?.cancellationSummary ?? undefined,
        },
      },
    });
  }

  async notifyBookingConfirmed(
    userId: string,
    listingTitle: string,
    reservationId: string,
    role: "GUEST" | "HOST",
  ) {
    const card = await loadReservationCard(reservationId);
    const guestCopy = role === "GUEST";
    const vehicle = card?.listingTitle || listingTitle;
    return this.createNotification({
      userId,
      type: NotificationType.BOOKING_CONFIRMED,
      title: guestCopy ? "Trip confirmed" : "A trip is confirmed",
      message: guestCopy
        ? `Payment received — your ${vehicle} trip is locked in`
        : `${card?.guestName || "Your guest"} paid — the ${vehicle} trip is confirmed`,
      data: { reservationId, listingTitle },
      actionUrl: `/reservations/${reservationId}`,
      dedupeKey: `res:${reservationId}:confirmed:${role}`,
      email: {
        subject: guestCopy
          ? `Confirmed — your ${listingTitle} trip is booked`
          : `Confirmed — ${listingTitle} is booked for ${card ? formatDateRange(card.startDate, card.endDate) : "your guest"}`,
        content: {
          preheader: guestCopy
            ? "Payment received and held securely. Here's what happens next."
            : "Your guest has paid. The dates are now blocked on your calendar.",
          eyebrow: "Trip confirmed",
          title: guestCopy ? "You're booked in" : "The trip is confirmed",
          paragraphs: guestCopy
            ? [
                `Payment for <strong>${vehicle}</strong> is received and held by Redrive until the return handover is agreed.`,
                `Closer to pickup you'll get the exact address, the host's contact details and a checklist for the handover. You can message the host any time from the trip page.`,
              ]
            : [
                `<strong>${card?.guestName || "Your guest"}</strong> has paid for <strong>${vehicle}</strong> and the dates are blocked on your calendar.`,
                `On the pickup day, open the trip in Redrive and complete the handover together — photos, odometer and fuel. Your payout is released once the return handover is agreed.`,
              ],
          facts: card
            ? [
                ...tripFacts(card, { includeTimes: true }),
                {
                  label: guestCopy ? "Total paid" : "Your payout",
                  value: formatMoney(guestCopy ? card.totalFees : card.ownerAmount),
                },
              ]
            : undefined,
          primaryButton: {
            label: "Open the trip",
            url: `${origin()}/reservations/${reservationId}`,
          },
        },
      },
    });
  }

  async notifyBookingReminder(
    userId: string,
    listingTitle: string,
    reservationId: string,
    startDate: Date,
    role: "GUEST" | "HOST" = "GUEST",
    tag?: string,
  ) {
    const daysUntil = Math.max(
      0,
      Math.ceil((new Date(startDate).getTime() - Date.now()) / 86_400_000),
    );
    const when = daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;
    const card = await loadReservationCard(reservationId);
    const guestCopy = role === "GUEST";
    const pickupMoment = card
      ? formatHandoverMoment(card.startDate, card.pickupTime, card.timezone)
      : null;
    const atTime = card?.pickupTime ? ` at ${formatTimeOfDay(card.pickupTime)}` : "";
    return this.createNotification({
      userId,
      type: NotificationType.TRIP_STARTING,
      title: guestCopy ? "Pickup coming up" : "A vehicle goes out soon",
      message: guestCopy
        ? `Your ${listingTitle} trip starts ${when}${atTime}`
        : `${card?.guestName || "A guest"} collects your ${listingTitle} ${when}${atTime}`,
      data: { reservationId, listingTitle, startDate, daysUntil },
      actionUrl: `/reservations/${reservationId}`,
      dedupeKey: `res:${reservationId}:starting:${role}${tag ? `:${tag}` : ""}`,
      email: {
        subject: guestCopy
          ? `Your ${listingTitle} pickup is ${when}`
          : `${listingTitle} goes out ${when}`,
        content: {
          preheader: guestCopy
            ? "Here's the address, the host's details and what to bring."
            : "Here's your guest's details and the handover checklist.",
          eyebrow: "Pickup reminder",
          title: guestCopy ? `Pickup ${when}` : `Handover ${when}`,
          paragraphs: guestCopy
            ? [
                `Your booking for <strong>${listingTitle}</strong> starts ${when}${pickupMoment ? `, pickup at <strong>${pickupMoment}</strong>` : ""}. Bring your physical driver licence and a payment card in your name.`,
                card?.address
                  ? `Pickup address: <strong>${card.address}</strong>. Host: ${card.hostName ?? "—"}${card.hostNumber ? ` · ${card.hostNumber}` : ""}.`
                  : `The exact address and host contact are on the trip page.`,
                `At pickup, complete the handover in the app together — photos, odometer and fuel — so both of you are covered.`,
              ]
            : [
                `<strong>${card?.guestName || "Your guest"}</strong> collects <strong>${listingTitle}</strong> ${when}${pickupMoment ? ` at <strong>${pickupMoment}</strong>` : ""}.`,
                `Have the vehicle clean, fuelled to the level you want it returned at, and ready ${pickupMoment ? "by then" : "at the agreed time"}. Complete the pickup handover in the app together.`,
              ],
          facts: card ? tripFacts(card, { includeTimes: true }) : undefined,
          primaryButton: {
            label: "Open the trip",
            url: `${origin()}/reservations/${reservationId}`,
          },
        },
      },
    });
  }

  /**
   * A handover time was set, proposed, or confirmed. Sent to whichever party
   * now needs to know / act:
   *  - CHANGED   → the owner set/moved it; the other side is informed.
   *  - PROPOSED  → the non-owner asked for a time; the owner must confirm.
   *  - CONFIRMED → the owner accepted a pending proposal; the proposer is told.
   *
   * `inAppOnly` debounces email when the trip is still far off and the same
   * person just changed the same time.
   */
  async notifyTripTimeChanged(
    userId: string,
    input: {
      reservationId: string;
      listingTitle: string;
      kind: HandoverKind;
      time: string;
      changedByRole: "HOST" | "GUEST";
      variant: "CHANGED" | "PROPOSED" | "CONFIRMED";
      inAppOnly?: boolean;
      updatedAtEpoch: number;
    },
  ) {
    const card = await loadReservationCard(input.reservationId);
    const isPickup = input.kind === "PICKUP";
    const label = isPickup ? "pickup" : "return";
    const who = input.changedByRole === "HOST" ? "The host" : "The guest";
    const moment = card
      ? formatHandoverMoment(
          isPickup ? card.startDate : card.endDate,
          input.time,
          card.timezone,
        )
      : formatTimeOfDay(input.time);

    const needsConfirm = input.variant === "PROPOSED";
    const title = needsConfirm
      ? `Confirm the ${label} time`
      : input.variant === "CONFIRMED"
        ? `${isPickup ? "Pickup" : "Return"} time confirmed`
        : `${isPickup ? "Pickup" : "Return"} time updated`;
    const message = needsConfirm
      ? `${who} proposed ${moment} for ${input.listingTitle}. Open the booking to confirm or suggest another time.`
      : input.variant === "CONFIRMED"
        ? `${who} confirmed ${moment} for ${input.listingTitle}.`
        : `${who} set the ${label} for ${input.listingTitle} to ${moment}.`;

    return this.createNotification({
      userId,
      type: NotificationType.BOOKING_REMINDER,
      title,
      message,
      data: { ...input },
      actionUrl: `/reservations/${input.reservationId}`,
      // Epoch keeps each distinct change deliverable even if it re-uses a value.
      dedupeKey: `res:${input.reservationId}:time:${input.kind}:${input.updatedAtEpoch}`,
      inAppOnly: input.inAppOnly,
      email: {
        subject: needsConfirm
          ? `Confirm the ${label} time for ${input.listingTitle}`
          : `${isPickup ? "Pickup" : "Return"} time for ${input.listingTitle}: ${moment}`,
        content: {
          preheader: needsConfirm
            ? `${who} proposed a ${label} time — it needs your confirmation.`
            : `${who} ${input.variant === "CONFIRMED" ? "confirmed" : "changed"} the ${label} time.`,
          eyebrow: "Handover time",
          title: needsConfirm ? `A ${label} time to confirm` : `${label[0].toUpperCase()}${label.slice(1)}: ${moment}`,
          paragraphs: [
            needsConfirm
              ? `${who} would like the ${label} for <strong>${input.listingTitle}</strong> to be <strong>${moment}</strong>. Open the booking to confirm it, or propose a different time.`
              : `${who} ${input.variant === "CONFIRMED" ? "confirmed" : "set"} the ${label} time for <strong>${input.listingTitle}</strong> to <strong>${moment}</strong>.`,
            isPickup
              ? `Coordinate anything else in Messages. Pickup times need to sit inside the host's pickup window.`
              : `Coordinate anything else in Messages.`,
          ],
          facts: card ? tripFacts(card, { includeTimes: true }) : undefined,
          primaryButton: {
            label: needsConfirm ? "Confirm the time" : "Open the booking",
            url: `${origin()}/reservations/${input.reservationId}`,
          },
        },
      },
    });
  }

  async notifyBookingCompleted(
    bookerId: string,
    listingTitle: string,
    reservationId: string,
  ) {
    return this.createNotification({
      userId: bookerId,
      type: NotificationType.BOOKING_COMPLETED,
      title: "Trip complete",
      message: `Your trip with ${listingTitle} is complete. How did it go?`,
      data: { reservationId, listingTitle },
      actionUrl: `/review/${reservationId}`,
      dedupeKey: `res:${reservationId}:completed`,
      email: {
        subject: `How was your ${listingTitle} trip?`,
        content: {
          preheader: "Your trip is complete. A short review helps the next guest and the host.",
          eyebrow: "Trip complete",
          title: "That's a wrap",
          paragraphs: [
            `Your trip with <strong>${listingTitle}</strong> is finished and the payout has been released to the host.`,
            `A short, honest review takes a minute and means a lot on a small marketplace — it's the main way good hosts get found.`,
          ],
          primaryButton: {
            label: "Leave a review",
            url: `${origin()}/review/${reservationId}`,
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------- payments

  async notifyReviewReceived(
    listingOwnerId: string,
    reviewerName: string,
    listingTitle: string,
    rating: number,
    listingId: string,
  ) {
    return this.createNotification({
      userId: listingOwnerId,
      type: NotificationType.REVIEW_RECEIVED,
      title: "New review",
      message: `${reviewerName} left a ${rating}-star review for ${listingTitle}`,
      data: { reviewerName, listingTitle, rating, listingId },
      actionUrl: `/listings/${listingId}`,
      dedupeKey: `review:${listingId}:${reviewerName}:${rating}`,
      email: {
        subject: `${reviewerName} reviewed ${listingTitle} — ${rating}★`,
        content: {
          preheader: `A new ${rating}-star review is live on your listing.`,
          eyebrow: "New review",
          title: `${rating} stars from ${reviewerName}`,
          paragraphs: [
            `<strong>${reviewerName}</strong> left a ${rating}-star review on <strong>${listingTitle}</strong>. You can reply publicly from the listing page.`,
          ],
          primaryButton: { label: "Read the review", url: `${origin()}/listings/${listingId}` },
        },
      },
    });
  }

  async notifyReviewReminder(
    userId: string,
    listingTitle: string,
    reservationId: string,
    role: "GUEST" | "HOST" = "GUEST",
  ) {
    const host = role === "HOST";
    return this.createNotification({
      userId,
      type: NotificationType.REVIEW_REMINDER,
      title: host ? "Review your guest" : "Leave a review",
      message: host
        ? `How was your guest on the ${listingTitle} trip?`
        : `How was your experience with ${listingTitle}?`,
      data: { listingTitle, reservationId, role },
      actionUrl: `/review/${reservationId}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dedupeKey: `res:${reservationId}:review-reminder:${role}`,
      email: {
        subject: host ? `Review your guest — ${listingTitle}` : `A quick review of ${listingTitle}?`,
        content: {
          preheader: host
            ? "Your review stays hidden until the guest reviews you too."
            : "It takes a minute and helps the next guest choose well.",
          eyebrow: "Review reminder",
          title: host ? "How was your guest?" : "How did it go?",
          paragraphs: [
            host
              ? `The <strong>${listingTitle}</strong> trip is done. A quick review of the guest — were they communicative, did they follow the rules, was the vehicle returned well — helps every other host know who they're lending to. It stays private until the guest reviews you or 14 days pass.`
              : `You recently finished a trip with <strong>${listingTitle}</strong>. A short review — even a line or two — helps other guests and rewards good hosts.`,
          ],
          primaryButton: {
            label: host ? "Review your guest" : "Write a review",
            url: `${origin()}/review/${reservationId}`,
          },
        },
      },
    });
  }

  async notifyExtensionRequested(
    hostId: string,
    guestName: string,
    listingTitle: string,
    reservationId: string,
    extraDays: number,
  ) {
    return this.createNotification({
      userId: hostId,
      type: NotificationType.SYSTEM_UPDATE,
      title: "Extension requested",
      message: `${guestName} wants to keep ${listingTitle} for ${extraDays} more day${extraDays === 1 ? "" : "s"}.`,
      data: { reservationId, extraDays },
      actionUrl: `/reservations/${reservationId}`,
      dedupeKey: `res:${reservationId}:ext-requested:${extraDays}`,
      email: {
        subject: `${guestName} wants to extend the ${listingTitle} trip`,
        content: {
          preheader: `${extraDays} more day${extraDays === 1 ? "" : "s"} — approve or decline on the trip page.`,
          eyebrow: "Trip change",
          title: "An extension request",
          paragraphs: [
            `<strong>${guestName}</strong> asked to keep <strong>${listingTitle}</strong> for <strong>${extraDays} more day${extraDays === 1 ? "" : "s"}</strong>. Redrive has checked the extra days are free on your calendar.`,
            `If you approve, the guest pays the pro-rata difference and the dates move automatically. If it doesn't suit, decline and the trip ends as booked.`,
          ],
          primaryButton: { label: "Review the request", url: `${origin()}/reservations/${reservationId}` },
        },
      },
    });
  }

  async notifyExtensionApproved(
    guestId: string,
    listingTitle: string,
    reservationId: string,
    extensionId: string,
    extraTotal: number,
  ) {
    return this.createNotification({
      userId: guestId,
      type: NotificationType.PAYMENT_REQUIRED,
      title: "Extension approved — pay to lock it in",
      message: `Pay ${formatMoney(extraTotal)} to extend ${listingTitle}.`,
      data: { reservationId, extensionId, extraTotal },
      actionUrl: `/reservations/${reservationId}?extpay=${extensionId}`,
      dedupeKey: `res:${reservationId}:ext-approved:${extensionId}`,
      email: {
        subject: `Extension approved — pay ${formatMoney(extraTotal)} to confirm`,
        content: {
          preheader: "Your host said yes. Pay the difference to move your return date.",
          eyebrow: "Trip change",
          title: "Your extra days are approved",
          paragraphs: [
            `The host approved extending <strong>${listingTitle}</strong>. Pay <strong>${formatMoney(extraTotal)}</strong> to confirm — the return date moves as soon as the payment clears.`,
            `The extra amount is held by Redrive alongside the rest of the trip and released to the host with the return handover.`,
          ],
          primaryButton: { label: "Pay & extend", url: `${origin()}/reservations/${reservationId}?extpay=${extensionId}` },
        },
      },
    });
  }

  async notifyClaimWindow(hostId: string, guestId: string, reservationId: string) {
    const card = await loadReservationCard(reservationId);
    const vehicle = card?.listingTitle || "the vehicle";
    await this.createNotification({
      userId: hostId,
      type: NotificationType.HANDOVER_ACTION,
      title: "Payout releasing soon — inspect now",
      message: `The return handover for ${vehicle} is agreed. Check the vehicle over — you have about 24 hours to report any damage before the payout is released.`,
      data: { reservationId },
      actionUrl: `/reservations/${reservationId}`,
      dedupeKey: `res:${reservationId}:claim-window`,
      email: {
        subject: `Inspect ${vehicle} — payout releases in ~24 hours`,
        content: {
          preheader: "Report any new damage now; after the window the payout is final.",
          eyebrow: "Return complete",
          title: "Give it a once-over",
          paragraphs: [
            `The return handover for <strong>${vehicle}</strong> is agreed. Redrive holds your payout for about <strong>24 hours</strong> so you can check the vehicle in daylight.`,
            `If you find new damage, open an issue from the trip page before the window closes — the handover photos are attached automatically. No issue, and the payout releases on its own.`,
          ],
          primaryButton: { label: "Open the trip", url: `${origin()}/reservations/${reservationId}` },
        },
      },
    });
    return this.createNotification({
      userId: guestId,
      type: NotificationType.BOOKING_COMPLETED,
      title: "Trip returned",
      message: `Your ${vehicle} return is confirmed. You can review the trip now.`,
      data: { reservationId },
      actionUrl: `/review/${reservationId}`,
      dedupeKey: `res:${reservationId}:returned`,
    });
  }

  async notifyExtensionDeclined(guestId: string, listingTitle: string, reservationId: string) {
    return this.createNotification({
      userId: guestId,
      type: NotificationType.SYSTEM_UPDATE,
      title: "Extension declined",
      message: `The host can't extend ${listingTitle}. The trip ends as booked.`,
      data: { reservationId },
      actionUrl: `/reservations/${reservationId}`,
      dedupeKey: `res:${reservationId}:ext-declined:${Date.now()}`,
    });
  }

  async notifyMessageReceived(
    userId: string,
    senderName: string,
    chatId: string,
    messagePreview: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: `Message from ${senderName}`,
      message: `${senderName}: ${messagePreview.substring(0, 60)}${messagePreview.length > 60 ? "…" : ""}`,
      data: { senderName, chatId, messagePreview },
      actionUrl: `/messages/${chatId}`,
    });
  }

  async notifyListingFavorited(
    listingOwnerId: string,
    userName: string,
    listingTitle: string,
    listingId: string,
  ) {
    return this.createNotification({
      userId: listingOwnerId,
      type: NotificationType.LISTING_FAVORITED,
      title: "Someone saved your listing",
      message: `${userName} added ${listingTitle} to their favourites`,
      data: { userName, listingTitle, listingId },
      actionUrl: `/listings/${listingId}`,
    });
  }

  async notifyListingUpdated(
    listingOwnerId: string,
    listingTitle: string,
    listingId: string,
  ) {
    return this.createNotification({
      userId: listingOwnerId,
      type: NotificationType.LISTING_UPDATED,
      title: "Listing updated",
      message: `Your listing ${listingTitle} was updated`,
      data: { listingTitle, listingId },
      actionUrl: `/listings/${listingId}`,
    });
  }

  async notifyProfileVerified(userId: string, verificationStatus: string) {
    const isVerified = verificationStatus === "Y" || verificationStatus === "VERIFIED";
    return this.createNotification({
      userId,
      type: NotificationType.PROFILE_VERIFIED,
      title: isVerified ? "You're verified" : "Verification needs attention",
      message: isVerified
        ? "Your identity check passed — you can book and host."
        : "We need a bit more to verify your identity.",
      data: { verificationStatus },
      actionUrl: `/profile`,
      dedupeKey: `profile:${userId}:verified:${isVerified ? "Y" : "N"}:${new Date().toISOString().slice(0, 10)}`,
    });
  }

  async notifyPaymentReceived(
    userId: string,
    amount: number,
    listingTitle: string,
    reservationId: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.PAYOUT_RELEASED,
      title: "Payout released",
      message: `${formatMoney(amount)} for ${listingTitle} is on its way to your bank`,
      data: { amount, listingTitle, reservationId },
      actionUrl: `/properties`,
      dedupeKey: `res:${reservationId}:payout`,
      email: {
        subject: `Payout released — ${formatMoney(amount)} for ${listingTitle}`,
        content: {
          preheader: `${formatMoney(amount)} has been sent to your connected account.`,
          eyebrow: "Payout",
          title: "Your payout is on the way",
          paragraphs: [
            `The return handover for <strong>${listingTitle}</strong> is complete, so <strong>${formatMoney(amount)}</strong> has been released to your connected Stripe account. Bank arrival times depend on your bank, usually 1–3 business days.`,
          ],
          primaryButton: { label: "View your trips", url: `${origin()}/properties` },
        },
      },
    });
  }

  async notifyPaymentRequired(
    userId: string,
    amount: number,
    listingTitle: string,
    reservationId: string,
  ) {
    const card = await loadReservationCard(reservationId);
    const vehicle = card?.listingTitle || listingTitle;
    return this.createNotification({
      userId,
      type: NotificationType.PAYMENT_REQUIRED,
      title: "Payment needed",
      message: `Pay ${formatMoney(amount)} within 48 hours to confirm ${vehicle}`,
      data: { amount, listingTitle, reservationId },
      actionUrl: `/reservations/${reservationId}?pay=1`,
      dedupeKey: `res:${reservationId}:payment-required`,
      email: {
        subject: `Pay to confirm your ${vehicle} booking`,
        content: {
          preheader: `${formatMoney(amount)} due in 48 hours. Your card isn't charged until you pay.`,
          eyebrow: "Payment needed",
          title: "One step to lock in your trip",
          paragraphs: [
            `Your booking for <strong>${vehicle}</strong> is approved. Pay <strong>${formatMoney(amount)}</strong> within <strong>48 hours</strong> to confirm it — after that the dates are released.`,
            `Payment is by card on a secure Stripe page. The funds are held by Redrive and only paid to the host once the return handover is agreed.`,
          ],
          facts: card
            ? [
                ...tripFacts(card, { includeTimes: true }),
                { label: "Total due", value: formatMoney(amount) },
              ]
            : [{ label: "Total due", value: formatMoney(amount) }],
          primaryButton: {
            label: "Pay now",
            url: `${origin()}/reservations/${reservationId}?pay=1`,
          },
          secondaryLink: {
            label: "See the full booking details",
            url: `${origin()}/reservations/${reservationId}`,
          },
          footnote: card?.cancellationSummary ?? undefined,
        },
      },
    });
  }

  async notifyPaymentWindowClosing(
    userId: string,
    listingTitle: string,
    reservationId: string,
    hoursLeft: number,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.PAYMENT_WINDOW_CLOSING,
      title: "Payment window closing",
      message: `About ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"} left to pay for ${listingTitle} before the dates are released`,
      data: { listingTitle, reservationId, hoursLeft },
      actionUrl: `/reservations/${reservationId}?pay=1`,
      dedupeKey: `res:${reservationId}:payment-closing:${hoursLeft <= 3 ? "final" : "warn"}`,
      forceSms: hoursLeft <= 3,
      sms: {
        body: `Redrive: ~${hoursLeft}h left to pay for ${listingTitle} or you'll lose the dates. ${origin()}/reservations/${reservationId}?pay=1`,
      },
      email: {
        subject: `Last chance — pay for ${listingTitle}`,
        content: {
          preheader: `Your approved booking is released in about ${hoursLeft} hours if it isn't paid.`,
          eyebrow: "Payment window",
          title: "Your dates are about to be released",
          paragraphs: [
            `Your booking for <strong>${listingTitle}</strong> was approved but hasn't been paid yet. If payment isn't completed in about <strong>${hoursLeft} hours</strong>, the dates go back on sale.`,
          ],
          primaryButton: { label: "Pay now", url: `${origin()}/reservations/${reservationId}?pay=1` },
        },
      },
    });
  }

  async notifyPaymentFailed(
    userId: string,
    listingTitle: string,
    reservationId: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.PAYMENT_FAILED,
      title: "Payment didn't go through",
      message: `Your payment for ${listingTitle} failed. Try another card before the window closes.`,
      data: { listingTitle, reservationId },
      actionUrl: `/reservations/${reservationId}`,
      dedupeKey: `res:${reservationId}:payment-failed:${Date.now()}`,
    });
  }

  async notifyRequestExpired(
    userId: string,
    listingTitle: string,
    reservationId: string,
    role: "GUEST" | "HOST",
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.BOOKING_REQUEST_EXPIRED,
      title: "Request expired",
      message:
        role === "GUEST"
          ? `Your request for ${listingTitle} expired without a response. Try another vehicle.`
          : `A request for ${listingTitle} expired because it wasn't answered in time.`,
      data: { listingTitle, reservationId, role },
      actionUrl: role === "GUEST" ? `/` : `/reservations`,
      dedupeKey: `res:${reservationId}:expired:${role}`,
    });
  }

  async notifyPayoutSetupRequired(userId: string) {
    return this.createNotification({
      userId,
      type: NotificationType.PAYOUT_SETUP_REQUIRED,
      title: "Finish your payout setup",
      message: "You can't approve bookings until your Stripe payout account is verified.",
      actionUrl: `/properties`,
      dedupeKey: `user:${userId}:payout-setup:${new Date().toISOString().slice(0, 10)}`,
      email: {
        subject: "Finish payout setup to start accepting bookings",
        content: {
          preheader: "A quick Stripe verification unlocks approvals and payouts.",
          eyebrow: "Host setup",
          title: "One step before you can host",
          paragraphs: [
            `Your listing is live, but Redrive can't release payouts until your Stripe payout account is verified. It takes a few minutes and unlocks the ability to approve bookings.`,
          ],
          primaryButton: { label: "Complete payout setup", url: `${origin()}/properties` },
        },
      },
    });
  }

  async notifyLicenceExpiring(
    userId: string,
    daysLeft: number,
    expiresAt: Date,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.LICENCE_EXPIRING,
      title: daysLeft <= 0 ? "Your licence has expired" : "Your licence is expiring",
      message:
        daysLeft <= 0
          ? "Re-verify your driver licence to keep booking and hosting."
          : `Your verified licence expires in ${daysLeft} days. Re-verify to avoid a gap.`,
      data: { daysLeft, expiresAt },
      actionUrl: `/profile`,
      dedupeKey: `user:${userId}:licence:${daysLeft <= 0 ? "expired" : daysLeft <= 7 ? "T-7" : "T-30"}`,
      email: {
        subject:
          daysLeft <= 0
            ? "Your Redrive licence verification has lapsed"
            : `Your licence verification expires in ${daysLeft} days`,
        content: {
          preheader: "Re-verify in a couple of minutes to keep full access.",
          eyebrow: "Identity",
          title: daysLeft <= 0 ? "Time to re-verify" : "A heads-up on your licence",
          paragraphs: [
            daysLeft <= 0
              ? `Your driver licence verification has expired, so bookings and hosting are paused until you re-verify. It only takes a couple of minutes.`
              : `Your verified driver licence expires in about <strong>${daysLeft} days</strong>. Re-verify now so there's no gap in your ability to book or host.`,
          ],
          primaryButton: { label: "Re-verify licence", url: `${origin()}/profile` },
        },
      },
    });
  }

  async notifyHandoverAction(
    userId: string,
    listingTitle: string,
    reservationId: string,
    phase: "PICKUP" | "RETURN",
    overdue = false,
    /** Distinguishes the escalating overdue nudges. */
    tag?: string,
  ) {
    const label = phase === "PICKUP" ? "pickup" : "return";
    const card = await loadReservationCard(reservationId);
    const plannedTime = phase === "PICKUP" ? card?.pickupTime : card?.handoverTime;
    const plannedMoment =
      card && plannedTime
        ? formatHandoverMoment(
            phase === "PICKUP" ? card.startDate : card.endDate,
            plannedTime,
            card.timezone,
          )
        : null;
    return this.createNotification({
      userId,
      type: NotificationType.HANDOVER_ACTION,
      title: overdue ? `${label} handover overdue` : `Time for the ${label} handover`,
      message: overdue
        ? `The ${label} handover for ${listingTitle} still needs both of you to confirm.`
        : `Open ${listingTitle} in the app to complete the ${label} handover together${plannedMoment ? ` — planned for ${plannedMoment}` : ""}.`,
      data: { listingTitle, reservationId, phase, overdue },
      actionUrl: `/reservations/${reservationId}`,
      dedupeKey: `res:${reservationId}:handover:${phase}:${overdue ? "overdue" : "due"}${tag ? `:${tag}` : ""}`,
      forceSms: overdue && phase === "RETURN",
      sms: {
        body: `Redrive: the ${label} handover for ${listingTitle} isn't finished. Both parties need to confirm in the app: ${origin()}/reservations/${reservationId}`,
      },
      email: {
        subject: overdue
          ? `Action needed — ${label} handover for ${listingTitle}`
          : `${label[0].toUpperCase()}${label.slice(1)} handover — ${listingTitle}`,
        content: {
          preheader: overdue
            ? "The payout is on hold until the return handover is agreed."
            : `Complete the ${label} handover in the app.`,
          eyebrow: "Handover",
          title: overdue ? "The handover still needs you" : `Time for the ${label} handover`,
          paragraphs: [
            overdue
              ? `The ${label} handover for <strong>${listingTitle}</strong> hasn't been confirmed by both parties. The host's payout stays on hold until it is. If something's wrong with the vehicle, open an issue from the trip page instead.`
              : `Open <strong>${listingTitle}</strong> in Redrive and complete the ${label} handover together — condition photos, odometer and fuel. It protects both of you.`,
            ...(plannedMoment && !overdue
              ? [`You'd agreed <strong>${plannedMoment}</strong> for this. If that's changed, update it on the booking so the other side knows.`]
              : []),
          ],
          facts: card ? tripFacts(card, { includeTimes: true }) : undefined,
          primaryButton: {
            label: "Open the handover",
            url: `${origin()}/reservations/${reservationId}`,
          },
        },
      },
    });
  }

  async notifyReviewPublished(
    userId: string,
    subjectLabel: string,
    actionUrl: string,
    reservationId: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.REVIEW_PUBLISHED,
      title: "Reviews are live",
      message: `Your review and ${subjectLabel} are now visible.`,
      data: { reservationId },
      actionUrl,
      dedupeKey: `res:${reservationId}:review-published:${userId}`,
    });
  }

  async notifyHostStatement(
    userId: string,
    monthLabel: string,
    trips: number,
    earnings: number,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.HOST_STATEMENT,
      title: `Your ${monthLabel} summary`,
      message: `${trips} completed trip${trips === 1 ? "" : "s"} · ${formatMoney(earnings)} earned`,
      data: { monthLabel, trips, earnings },
      actionUrl: `/properties`,
      dedupeKey: `user:${userId}:statement:${monthLabel}`,
      email: {
        marketing: false,
        subject: `Redrive — your ${monthLabel} host summary`,
        content: {
          preheader: `${trips} trips, ${formatMoney(earnings)} earned in ${monthLabel}.`,
          eyebrow: "Monthly summary",
          title: `${monthLabel} in review`,
          paragraphs: [
            `In ${monthLabel} you completed <strong>${trips} trip${trips === 1 ? "" : "s"}</strong> and earned <strong>${formatMoney(earnings)}</strong> in payouts (before any Stripe fees).`,
            `Keep your calendar open a few weeks ahead — vehicles with availability get found first.`,
          ],
          primaryButton: { label: "Open your listings", url: `${origin()}/properties` },
        },
      },
    });
  }

  async notifyListingDormant(
    userId: string,
    listingTitle: string,
    listingId: string,
    daysListed: number,
  ) {
    const monthKey = new Date().toISOString().slice(0, 7);
    return this.createNotification({
      userId,
      type: NotificationType.SYSTEM_UPDATE,
      title: "Your listing hasn't had a booking yet",
      message: `${listingTitle} has been listed for ${daysListed} days with no trips. A few tweaks usually help.`,
      data: { listingId, daysListed },
      actionUrl: `/listings/${listingId}`,
      dedupeKey: `listing:${listingId}:dormant:${monthKey}`,
      email: {
        marketing: true,
        subject: `Getting your ${listingTitle} booked`,
        content: {
          preheader: "A quick checklist to help your listing get found and booked.",
          eyebrow: "Host tip",
          title: "Let's get that vehicle earning",
          paragraphs: [
            `<strong>${listingTitle}</strong> has been on Redrive for about ${daysListed} days without a booking. On a young marketplace that's common — a few things reliably help:`,
            `• Open your calendar 4–6 weeks ahead — vehicles with availability get found first.<br>• Add 6+ clear photos, including the interior and any tow bar / tray.<br>• Check your daily price against similar vehicles nearby.<br>• Turn on Instant Book if you're comfortable — it converts far better.`,
          ],
          primaryButton: { label: "Edit your listing", url: `${origin()}/listings/${listingId}` },
        },
      },
    });
  }

  async notifySystemUpdate(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.SYSTEM_UPDATE,
      title,
      message,
      actionUrl,
    });
  }

  // ---------------------------------------------------------- lifecycle drips

  async sendHostOnboarding(userId: string) {
    return this.createNotification({
      userId,
      type: NotificationType.SYSTEM_UPDATE,
      title: "Getting your first booking",
      message: "A few things reliably help a new listing get found and booked.",
      actionUrl: "/properties",
      dedupeKey: `user:${userId}:onboard-host-1`,
      skipInApp: true,
      email: {
        subject: "Your Redrive listing — 3 things that get you booked",
        content: {
          preheader: "Photos, calendar, price. Two minutes each.",
          eyebrow: "Host tips",
          title: "Let's get that vehicle earning",
          paragraphs: [
            `Your listing is live. On a young marketplace, three things do most of the work:`,
            `<strong>1. Photos.</strong> Six or more, in daylight — the front three-quarter, the interior, the boot or tray, and anything unusual (tow bar, roof height, canopy).<br><br><strong>2. Calendar.</strong> Open 4–6 weeks ahead. Vehicles with availability are the ones guests find.<br><br><strong>3. Price.</strong> Check yours against similar vehicles nearby, and consider turning on Instant Book — it converts far better than a request-and-wait.`,
          ],
          primaryButton: { label: "Open your listings", url: `${origin()}/properties` },
        },
      },
    });
  }

  async sendGuestOnboarding(userId: string) {
    return this.createNotification({
      userId,
      type: NotificationType.SYSTEM_UPDATE,
      title: "How Redrive works",
      message: "Find the exact vehicle for the job, from someone local.",
      actionUrl: "/",
      dedupeKey: `user:${userId}:onboard-guest-1`,
      skipInApp: true,
      email: {
        subject: "The right vehicle, when the family car won't do it",
        content: {
          preheader: "Utes, vans, campers and 4WDs from local owners.",
          eyebrow: "Getting started",
          title: "Welcome — here's the idea",
          paragraphs: [
            `Redrive is where people hire the vehicle they actually need for a job — a ute for a tip run, a van for moving, a camper for the long weekend — from someone in their own suburb.`,
            `You see the full price before you ask, your card isn't charged until the host accepts, and every owner and guest is ID-checked. Browse what's near you and save a few favourites for when you need them.`,
          ],
          primaryButton: { label: "Browse vehicles", url: `${origin()}/` },
        },
      },
    });
  }

  async sendReengagement(userId: string, vehiclesNearby: number, area: string | null) {
    return this.createNotification({
      userId,
      type: NotificationType.SYSTEM_UPDATE,
      title: "New vehicles on Redrive",
      message: area
        ? `${vehiclesNearby} vehicles are now available around ${area}.`
        : "New vehicles have joined Redrive.",
      actionUrl: "/",
      dedupeKey: `user:${userId}:reengage:${new Date().toISOString().slice(0, 7)}`,
      skipInApp: true,
      email: {
        marketing: true,
        subject: area
          ? `${vehiclesNearby} vehicles to hire around ${area}`
          : "New vehicles to hire on Redrive",
        content: {
          preheader: "It's been a while — here's what's available now.",
          eyebrow: "Redrive",
          title: "Still need a vehicle now and then?",
          paragraphs: [
            area
              ? `There are now <strong>${vehiclesNearby}</strong> vehicles listed around ${area} — utes, vans, 4WDs and campers from local owners.`
              : `New vehicles have joined Redrive across the country.`,
            `Prices are shown in full before you ask, and your card isn't charged until the host accepts.`,
          ],
          primaryButton: { label: "See what's available", url: `${origin()}/` },
        },
      },
    });
  }

  async notifySecurityAlert(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string,
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.SECURITY_ALERT,
      title,
      message,
      actionUrl,
      dedupeKey: `user:${userId}:security:${title}:${Date.now()}`,
    });
  }

  async cleanupExpiredNotifications() {
    try {
      const result = await prisma.notification.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      const deliveries = await prisma.notificationDelivery.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 120 * 86_400_000) } },
      });
      console.log(
        `Cleaned ${result.count} expired notifications, ${deliveries.count} old delivery rows`,
      );
      return result;
    } catch (error) {
      console.error("Error cleaning up notifications:", error);
      throw error;
    }
  }
}

function origin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://redrive.com.au"
  ).replace(/\/$/, "");
}

export const notificationService = new NotificationService();
