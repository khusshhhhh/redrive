import assert from "node:assert/strict";
import test from "node:test";

import { NotificationType } from "@prisma/client";

import { resolveChannels } from "./policy";

const base = {
  notifyEmailEnabled: true,
  notifyPushEnabled: true,
  notifySmsEnabled: false,
  smsNumberPresent: true,
  notificationPrefs: null,
  localHour: 12,
  quietHoursStart: null,
  quietHoursEnd: null,
};

test("transactional events always email, even with email disabled", () => {
  const channels = resolveChannels({
    ...base,
    type: NotificationType.BOOKING_APPROVED,
    notifyEmailEnabled: false,
  });
  assert.deepEqual(channels.sort(), ["EMAIL", "IN_APP", "PUSH"]);
});

test("activity events respect the email master switch", () => {
  const channels = resolveChannels({
    ...base,
    type: NotificationType.REVIEW_RECEIVED,
    notifyEmailEnabled: false,
    notifyPushEnabled: false,
  });
  assert.deepEqual(channels, ["IN_APP"]);
});

test("quiet events are in-app only by default", () => {
  const channels = resolveChannels({ ...base, type: NotificationType.LISTING_FAVORITED });
  assert.deepEqual(channels, ["IN_APP"]);
});

test("a per-type override can mute an activity email", () => {
  const channels = resolveChannels({
    ...base,
    type: NotificationType.REVIEW_REMINDER,
    notificationPrefs: { REVIEW_REMINDER: { email: false, push: false } },
  });
  assert.deepEqual(channels, ["IN_APP"]);
});

test("quiet hours hold a non-urgent push but not an urgent one", () => {
  const nightBase = { ...base, localHour: 2, quietHoursStart: 22, quietHoursEnd: 7 };
  assert.ok(
    !resolveChannels({ ...nightBase, type: NotificationType.BOOKING_REMINDER }).includes("PUSH"),
  );
  assert.ok(
    resolveChannels({ ...nightBase, type: NotificationType.SECURITY_ALERT }).includes("PUSH"),
  );
});

test("SMS only when opted in and the event is time-critical", () => {
  assert.ok(
    !resolveChannels({ ...base, type: NotificationType.TRIP_STARTING }).includes("SMS"),
  );
  assert.ok(
    resolveChannels({
      ...base,
      type: NotificationType.PAYMENT_WINDOW_CLOSING,
      forceSms: true,
    }).includes("SMS"),
  );
});

test("forced SMS still needs a number on file", () => {
  const channels = resolveChannels({
    ...base,
    type: NotificationType.PAYMENT_WINDOW_CLOSING,
    smsNumberPresent: false,
    forceSms: true,
  });
  assert.ok(!channels.includes("SMS"));
});
