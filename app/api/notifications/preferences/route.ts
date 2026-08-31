import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

const CHANNEL_KEYS = ["email", "push", "sms"] as const;

type PrefMap = Record<string, { email?: boolean; push?: boolean; sms?: boolean }>;

function cleanPrefs(value: unknown): PrefMap {
  if (!value || typeof value !== "object") return {};
  const out: PrefMap = {};
  for (const [type, channels] of Object.entries(value as Record<string, unknown>)) {
    if (typeof type !== "string" || type.length > 40 || !channels || typeof channels !== "object") continue;
    const entry: { email?: boolean; push?: boolean; sms?: boolean } = {};
    for (const key of CHANNEL_KEYS) {
      const v = (channels as Record<string, unknown>)[key];
      if (typeof v === "boolean") entry[key] = v;
    }
    if (Object.keys(entry).length) out[type] = entry;
  }
  return out;
}

/** Returns the hour, `null` to clear, or `undefined` when the value is invalid. */
function clampHour(value: unknown): number | null | undefined {
  if (value === null) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : undefined;
}

async function GETHandler() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      notifyEmailEnabled: true,
      notifyPushEnabled: true,
      notifySmsEnabled: true,
      marketingEmailConsent: true,
      notificationPrefs: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      timezone: true,
      number: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    { ...user, hasMobileNumber: Boolean(user.number), number: undefined },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function PATCHHandler(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await consumeRateLimits([
    { scope: "notif-prefs-user", identifier: currentUser.id, limit: 30, windowMs: 60 * 60_000 },
    { scope: "notif-prefs-ip", identifier: getClientIp(request), limit: 60, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  for (const flag of ["notifyEmailEnabled", "notifyPushEnabled", "notifySmsEnabled"] as const) {
    if (typeof body[flag] === "boolean") data[flag] = body[flag];
  }

  if (typeof body.marketingEmailConsent === "boolean") {
    data.marketingEmailConsent = body.marketingEmailConsent;
    data.marketingEmailConsentAt = body.marketingEmailConsent ? new Date() : null;
  }

  if ("notificationPrefs" in body) {
    data.notificationPrefs = cleanPrefs(body.notificationPrefs);
  }

  for (const hourKey of ["quietHoursStart", "quietHoursEnd"] as const) {
    if (hourKey in body) {
      const hour = clampHour(body[hourKey]);
      if (hour === undefined) {
        return NextResponse.json({ error: "Quiet hours must be 0–23 or null" }, { status: 400 });
      }
      data[hourKey] = hour;
    }
  }

  if (typeof body.timezone === "string" && body.timezone.length <= 64) {
    try {
      new Intl.DateTimeFormat("en-AU", { timeZone: body.timezone });
      data.timezone = body.timezone;
    } catch {
      return NextResponse.json({ error: "Unknown timezone" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data,
    select: {
      notifyEmailEnabled: true,
      notifyPushEnabled: true,
      notifySmsEnabled: true,
      marketingEmailConsent: true,
      notificationPrefs: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      timezone: true,
    },
  });

  await writeAuditEvent({
    request,
    actorUserId: currentUser.id,
    action: "NOTIFICATION_PREFERENCES_UPDATED",
    targetType: "User",
    targetId: currentUser.id,
    metadata: { fields: Object.keys(data).join(",") },
  });

  return NextResponse.json(updated, { headers: { "Cache-Control": "private, no-store" } });
}

export const GET = monitorApiRoute("/api/notifications/preferences", GETHandler, "GET");
export const PATCH = monitorApiRoute("/api/notifications/preferences", PATCHHandler, "PATCH");
