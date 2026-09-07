import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

// Ratchet: every NEW mutating API route (POST / PUT / PATCH) must validate its
// request body with a zod schema — either `defineApiRoute({ body: … })` or an
// explicit `.safeParse` / `.parse`. The routes below predate that convention
// and do ad-hoc field checks; they're allowed for now and should be migrated to
// `defineApiRoute` incrementally. Do not add to this list.

const API_ROOT = join(process.cwd(), "app", "api");

const LEGACY_UNVALIDATED = new Set([
  "app/api/admin/licences/[userId]/route.ts",
  "app/api/auth/activity/route.ts",
  "app/api/auth/forgot-password/route.ts",
  "app/api/auth/login/route.ts",
  "app/api/auth/resend-verification/route.ts",
  "app/api/auth/reset-password/route.ts",
  "app/api/auth/verify-email/route.ts",
  "app/api/calendar/feed/route.ts",
  "app/api/chats/[chatId]/messages/route.ts",
  "app/api/chats/[chatId]/read/route.ts",
  "app/api/chats/[chatId]/typing/route.ts",
  "app/api/chats/route.ts",
  "app/api/cron/notifications/route.ts",
  "app/api/favorites/[listingId]/route.ts",
  "app/api/license-verification/route.ts",
  "app/api/listings/[listingId]/availability/route.ts",
  "app/api/listings/[listingId]/calendars/route.ts",
  "app/api/listings/[listingId]/route.ts",
  "app/api/listings/route.ts",
  "app/api/mobile/v1/auth/logout-all/route.ts",
  "app/api/mobile/v1/me/deletion-code/route.ts",
  "app/api/mobile/v1/reservations/driver-licence/route.ts",
  "app/api/notifications/[notificationId]/route.ts",
  "app/api/notifications/bulk/route.ts",
  "app/api/notifications/preferences/route.ts",
  "app/api/notifications/route.ts",
  "app/api/notifications/unsubscribe/route.ts",
  "app/api/payments/connect/route.ts",
  "app/api/presence/route.ts",
  "app/api/profile/delete-account/route.ts",
  "app/api/profile/route.ts",
  "app/api/profile/security/route.ts",
  "app/api/realtime/auth/route.ts",
  "app/api/register/route.ts",
  "app/api/reservations/[reservationId]/checkout/route.ts",
  "app/api/reservations/[reservationId]/drivers/route.ts",
  "app/api/reservations/[reservationId]/extend/[extensionId]/pay/route.ts",
  "app/api/reservations/[reservationId]/extend/[extensionId]/route.ts",
  "app/api/reservations/[reservationId]/extend/route.ts",
  "app/api/reservations/[reservationId]/guest-review/route.ts",
  "app/api/reservations/[reservationId]/handover/route.ts",
  "app/api/reservations/[reservationId]/incidents/[incidentId]/route.ts",
  "app/api/reservations/[reservationId]/incidents/route.ts",
  "app/api/reservations/[reservationId]/route.ts",
  "app/api/reservations/[reservationId]/shorten/route.ts",
  "app/api/reservations/[reservationId]/times/route.ts",
  "app/api/reservations/driver-licence/route.ts",
  "app/api/reservations/route.ts",
  "app/api/reviews/route.ts",
  "app/api/saved-searches/[searchId]/route.ts",
  "app/api/stripe/webhook/route.ts",
  "app/api/upload/route.ts",
]);

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(path) : entry.name === "route.ts" ? [path] : [];
  });
}

const mutates = (src: string) => /export const (POST|PUT|PATCH) =/.test(src);
const validates = (src: string) =>
  (/defineApiRoute\b/.test(src) && /^\s*body:/m.test(src)) ||
  /\.safeParse\(|\bz\.object\(|Schema\.parse\(|RequestSchema\b|BodySchema\b/.test(src);

test("new mutating API routes validate their body with a zod schema", () => {
  const offenders: string[] = [];
  const stale: string[] = [];

  for (const file of routeFiles(API_ROOT)) {
    const rel = relative(process.cwd(), file).replaceAll("\\", "/");
    const src = readFileSync(file, "utf8");
    if (!mutates(src)) continue;

    const ok = validates(src);
    if (!ok && !LEGACY_UNVALIDATED.has(rel)) offenders.push(rel);
    if (ok && LEGACY_UNVALIDATED.has(rel)) stale.push(rel);
  }

  assert.equal(
    offenders.length,
    0,
    `these mutating routes have no zod body schema — use defineApiRoute({ body: … }):\n  ${offenders.join("\n  ")}`,
  );

  // Not a failure: nudge to trim the allowlist as routes get migrated.
  if (stale.length) {
    console.log(
      `apiRouteValidation: ${stale.length} route(s) now validate — remove from LEGACY_UNVALIDATED:\n  ${stale.join("\n  ")}`,
    );
  }
});
