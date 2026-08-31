import { NotificationType } from "@prisma/client";

export type Channel = "IN_APP" | "EMAIL" | "PUSH" | "SMS";

/**
 * How each event class is delivered by default.
 *
 * - `transactional`  — about a live booking, payment or safety. Email + push
 *   always send; the user cannot mute them (they can still stop marketing mail).
 * - `activity`       — useful but not critical. Email + push unless the user
 *   turns that type off in their notification settings.
 * - `quiet`          — in-app only by default; email/push only if explicitly on.
 */
type EventClass = "transactional" | "activity" | "quiet";

const EVENT_CLASS: Record<NotificationType, EventClass> = {
  BOOKING_REQUEST: "transactional",
  BOOKING_APPROVED: "transactional",
  BOOKING_DECLINED: "transactional",
  BOOKING_CANCELLED: "transactional",
  BOOKING_CONFIRMED: "transactional",
  BOOKING_REQUEST_EXPIRED: "transactional",
  BOOKING_REMINDER: "transactional",
  BOOKING_COMPLETED: "activity",
  PAYMENT_REQUIRED: "transactional",
  PAYMENT_RECEIVED: "activity",
  PAYMENT_WINDOW_CLOSING: "transactional",
  PAYMENT_FAILED: "transactional",
  PAYOUT_RELEASED: "transactional",
  PAYOUT_SETUP_REQUIRED: "transactional",
  TRIP_STARTING: "transactional",
  TRIP_RETURNING: "transactional",
  HANDOVER_ACTION: "transactional",
  LICENCE_EXPIRING: "transactional",
  HOST_STATEMENT: "activity",
  REVIEW_RECEIVED: "activity",
  REVIEW_REMINDER: "activity",
  REVIEW_PUBLISHED: "activity",
  MESSAGE_RECEIVED: "activity",
  LISTING_FAVORITED: "quiet",
  LISTING_UPDATED: "quiet",
  PROFILE_VERIFIED: "transactional",
  SECURITY_ALERT: "transactional",
  SYSTEM_UPDATE: "activity",
};

/** Events allowed to fall back to SMS when in quiet hours / high urgency. */
const SMS_ELIGIBLE = new Set<NotificationType>([
  NotificationType.PAYMENT_WINDOW_CLOSING,
  NotificationType.HANDOVER_ACTION,
  NotificationType.TRIP_STARTING,
  NotificationType.SECURITY_ALERT,
]);

/** Events that must never be held for quiet hours on push. */
const URGENT = new Set<NotificationType>([
  NotificationType.PAYMENT_WINDOW_CLOSING,
  NotificationType.SECURITY_ALERT,
  NotificationType.HANDOVER_ACTION,
]);

export interface ChannelPreferenceInput {
  type: NotificationType;
  notifyEmailEnabled: boolean;
  notifyPushEnabled: boolean;
  notifySmsEnabled: boolean;
  smsNumberPresent: boolean;
  notificationPrefs?: Record<string, { email?: boolean; push?: boolean; sms?: boolean }> | null;
  /** Local hour 0-23 in the user's timezone, or null if unknown. */
  localHour: number | null;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  /** Caller can force SMS on (e.g. the "final call" payment nudge). */
  forceSms?: boolean;
}

function inQuietHours(hour: number | null, start?: number | null, end?: number | null): boolean {
  if (hour == null || start == null || end == null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/**
 * Resolve which channels a single notification should go out on. In-app is
 * always included — it is the record in the notification centre.
 */
export function resolveChannels(input: ChannelPreferenceInput): Channel[] {
  const channels: Channel[] = ["IN_APP"];
  const klass = EVENT_CLASS[input.type];
  const override = input.notificationPrefs?.[input.type] ?? {};

  const emailDefault = klass === "transactional" || klass === "activity";
  const pushDefault = klass === "transactional" || klass === "activity";

  const emailAllowed =
    klass === "transactional"
      ? true // transactional email cannot be muted
      : input.notifyEmailEnabled && (override.email ?? emailDefault);
  const pushAllowed =
    klass === "transactional"
      ? input.notifyPushEnabled || URGENT.has(input.type)
      : input.notifyPushEnabled && (override.push ?? pushDefault);

  if (emailAllowed) channels.push("EMAIL");

  const quiet = inQuietHours(input.localHour, input.quietHoursStart, input.quietHoursEnd);
  if (pushAllowed && (!quiet || URGENT.has(input.type))) channels.push("PUSH");

  const smsWanted =
    input.forceSms ||
    (SMS_ELIGIBLE.has(input.type) && input.notifySmsEnabled && (quiet || URGENT.has(input.type)));
  if (
    smsWanted &&
    input.smsNumberPresent &&
    (override.sms ?? true) &&
    (input.notifySmsEnabled || input.forceSms)
  ) {
    channels.push("SMS");
  }

  return channels;
}

export function isTransactional(type: NotificationType): boolean {
  return EVENT_CLASS[type] === "transactional";
}

export { SMS_ELIGIBLE, URGENT };
