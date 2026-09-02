import { NotificationType, Prisma } from "@prisma/client";

import prisma from "@/app/libs/prismadb";
import { siteUrl } from "@/app/libs/siteUrl";

import { sendTransactionalEmail } from "./email";
import type { RenderEmailInput } from "./emailLayout";
import { resolveChannels, type Channel } from "./policy";
import { sendPushToUser } from "./push";
import { sendSms } from "./sms";

export type EmailContent = Omit<RenderEmailInput, "appUrl" | "unsubscribeUrl">;

export interface DispatchInput {
  userId: string;
  type: NotificationType;
  /** In-app + push title. */
  title: string;
  /** In-app + push body. */
  message: string;
  data?: Prisma.InputJsonValue;
  actionUrl?: string;
  expiresAt?: Date;
  /**
   * Stable base key for cross-run de-duplication of email/push/sms (the channel
   * is appended). Omit for events that may legitimately repeat (e.g. a new
   * message). The in-app row is always written.
   */
  dedupeKey?: string;
  /** Rich email override. When absent a generic email is built from title/message. */
  email?: {
    subject: string;
    content: EmailContent;
    /** Lifecycle / re-engagement mail: adds unsubscribe + needs marketing consent. */
    marketing?: boolean;
  };
  /** SMS body override. Only used when the SMS channel resolves. */
  sms?: { body: string };
  /** Force the SMS channel on regardless of quiet-hours logic (still needs a number). */
  forceSms?: boolean;
  /** Skip the in-app notification row (rare — e.g. pure SMS safety ping). */
  skipInApp?: boolean;
  /**
   * Deliver in-app only — no email / push / SMS this run. Used to debounce
   * chatty updates (e.g. a host nudging a pickup time several times while the
   * trip is still days away): the notification-centre entry is enough.
   */
  inAppOnly?: boolean;
}

export interface DispatchResult {
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

function localHour(timezone: string | null | undefined): number | null {
  if (!timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const hour = parts.find((part) => part.type === "hour")?.value;
    return hour ? Number(hour) % 24 : null;
  } catch {
    return null;
  }
}

function genericEmail(input: DispatchInput, absoluteActionUrl: string | null): EmailContent {
  return {
    preheader: input.message,
    eyebrow: "Redrive",
    title: input.title,
    paragraphs: [input.message],
    primaryButton: absoluteActionUrl ? { label: "Open Redrive", url: absoluteActionUrl } : null,
  };
}

async function alreadyDelivered(dedupeKey: string): Promise<boolean> {
  const existing = await prisma.notificationDelivery.findUnique({
    where: { dedupeKey },
    select: { id: true },
  });
  return Boolean(existing);
}

async function recordDelivery(
  userId: string,
  dedupeKey: string | undefined,
  channel: Channel,
  type: string,
  status: "SENT" | "FAILED" | "SKIPPED",
  detail?: string,
) {
  if (!dedupeKey) return;
  try {
    await prisma.notificationDelivery.upsert({
      where: { dedupeKey: `${dedupeKey}:${channel}` },
      create: { userId, dedupeKey: `${dedupeKey}:${channel}`, channel, type, status, detail },
      update: { status, detail },
    });
  } catch {
    /* a racing dispatch already wrote it — fine */
  }
}

/**
 * Single fan-out point for every user-facing notification. Creates the in-app
 * record, then delivers to email / push / SMS according to the user's
 * preferences and the event class. Never throws — every channel is best-effort
 * and logged.
 */
export async function dispatchNotification(input: DispatchInput): Promise<DispatchResult> {
  const result: DispatchResult = { inApp: false, email: false, push: false, sms: false };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      email: true,
      number: true,
      name: true,
      timezone: true,
      notifyEmailEnabled: true,
      notifyPushEnabled: true,
      notifySmsEnabled: true,
      marketingEmailConsent: true,
      notificationPrefs: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      emailUnsubscribeToken: true,
    },
  });
  if (!user) return result;

  // 1. In-app record (the notification-centre entry). When a dedupeKey is set,
  // the row is written at most once — so a cron that re-runs doesn't stack up
  // identical entries in the notification centre.
  const inAppAlready = input.dedupeKey
    ? await alreadyDelivered(`${input.dedupeKey}:IN_APP`)
    : false;
  if (!input.skipInApp && !inAppAlready) {
    try {
      await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          data: input.data ?? {},
          actionUrl: input.actionUrl ?? null,
          expiresAt: input.expiresAt ?? null,
        },
      });
      result.inApp = true;
    } catch (error) {
      console.error("In-app notification write failed", input.type, error);
    }
    await recordDelivery(input.userId, input.dedupeKey, "IN_APP", input.type, "SENT");
  }

  const channels: Channel[] = input.inAppOnly
    ? ["IN_APP"]
    : resolveChannels({
        type: input.type,
        notifyEmailEnabled: user.notifyEmailEnabled,
        notifyPushEnabled: user.notifyPushEnabled,
        notifySmsEnabled: user.notifySmsEnabled,
        smsNumberPresent: Boolean(user.number),
        notificationPrefs: (user.notificationPrefs as unknown as ChannelPrefs) ?? null,
        localHour: localHour(user.timezone),
        quietHoursStart: user.quietHoursStart,
        quietHoursEnd: user.quietHoursEnd,
        forceSms: input.forceSms,
      });

  const absoluteActionUrl = input.actionUrl
    ? input.actionUrl.startsWith("http")
      ? input.actionUrl
      : `${siteUrl}${input.actionUrl}`
    : null;

  // 2. Email.
  if (channels.includes("EMAIL") && user.email) {
    const isMarketing = input.email?.marketing === true;
    const consentOk = !isMarketing || user.marketingEmailConsent;
    const dedupeHit = input.dedupeKey ? await alreadyDelivered(`${input.dedupeKey}:EMAIL`) : false;

    if (!consentOk) {
      await recordDelivery(input.userId, input.dedupeKey, "EMAIL", input.type, "SKIPPED", "no-marketing-consent");
    } else if (!dedupeHit) {
      const content = input.email?.content ?? genericEmail(input, absoluteActionUrl);
      const unsubscribeUrl =
        isMarketing && user.emailUnsubscribeToken
          ? `${siteUrl}/api/notifications/unsubscribe?token=${user.emailUnsubscribeToken}`
          : null;
      const sent = await sendTransactionalEmail({
        to: user.email,
        subject: input.email?.subject ?? input.title,
        unsubscribeUrl,
        content: { ...content, greeting: content.greeting ?? greetingFor(user.name) },
      });
      result.email = sent.delivered;
      await recordDelivery(
        input.userId,
        input.dedupeKey,
        "EMAIL",
        input.type,
        sent.delivered ? "SENT" : "FAILED",
        sent.skippedReason,
      );
    }
  }

  // 3. Push.
  if (channels.includes("PUSH")) {
    const dedupeHit = input.dedupeKey ? await alreadyDelivered(`${input.dedupeKey}:PUSH`) : false;
    if (!dedupeHit) {
      const push = await sendPushToUser(input.userId, {
        title: input.title,
        body: input.message,
        data: {
          type: input.type,
          url: input.actionUrl ?? undefined,
        },
      });
      result.push = push.delivered;
      await recordDelivery(
        input.userId,
        input.dedupeKey,
        "PUSH",
        input.type,
        push.delivered ? "SENT" : "SKIPPED",
        push.skippedReason,
      );
    }
  }

  // 4. SMS (time-critical only).
  if (channels.includes("SMS") && user.number) {
    const dedupeHit = input.dedupeKey ? await alreadyDelivered(`${input.dedupeKey}:SMS`) : false;
    if (!dedupeHit) {
      const body = input.sms?.body ?? `${input.title} — ${input.message}${absoluteActionUrl ? ` ${absoluteActionUrl}` : ""}`;
      const sms = await sendSms(user.number, body.slice(0, 320));
      result.sms = sms.delivered;
      await recordDelivery(
        input.userId,
        input.dedupeKey,
        "SMS",
        input.type,
        sms.delivered ? "SENT" : "SKIPPED",
        sms.skippedReason,
      );
    }
  }

  return result;
}

type ChannelPrefs = Record<string, { email?: boolean; push?: boolean; sms?: boolean }> | null;

function greetingFor(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Hi ${first},` : "Hi there,";
}
