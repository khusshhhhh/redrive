# Redrive Mobile — Code Review Findings & Next-Step Guide

**Reviewed:** 29 August 2026
**Scope:** `apps/mobile` full source pass, plus the `/api/mobile/v1` routes it calls.
**State at review:** Slices 1–4 of `expoGuide.md` implemented. `npm run typecheck:mobile`,
`npx eslint apps/mobile/src`, and `npm run test:mobile` (6 tests) all pass.

---

## Part 1 — What this review changed

The codebase is in good shape: one API client, one session model, opaque
refresh tokens with reuse handling, idempotent mutations, safe deep-link/notification
parsing, and consistent loading/error/empty states. Five real gaps were fixed.

| # | File(s) | Problem | Fix |
|---|---------|---------|-----|
| 1 | `src/services/api/paginated.ts` (new), `features/listings/explore-screen.tsx`, `app/(app)/(tabs)/favourites.tsx`, `trips.tsx`, `inbox.tsx` | Every list screen fetched **only the first page**. `nextCursor`/`hasMore` were in the response type but never sent back as `?cursor=`, so users could never scroll past ~20–30 rows. | New `useCursorList` hook wrapping `useInfiniteQuery`. All four lists now do `onEndReached` paging, show a footer spinner, and support pull-to-refresh (`RefreshControl`). |
| 2 | `src/app/(app)/chat/[chatId].tsx` | Message history was a single page with no polling — older messages unreachable, new inbound messages invisible until you sent one. | Cursor paging on the inverted list (scroll up = older) + `refetchInterval: 12_000` for near-live updates, matching the "foreground polling" direction in Slice 4. |
| 3 | `src/app/+native-intent.tsx` | `redirectSystemPath` could throw (e.g. malformed `Constants` access); a throwing resolver breaks **all** inbound linking. | Wrapped in `try/catch` with a safe `"/"` fallback. |
| 4 | `src/components/notification-navigation.tsx` | Cold-start notification taps could **double-navigate** (`getLastNotificationResponseAsync` + the listener both fire) and could fire **before the navigator mounted** (tap lost). | De-dupe by notification `identifier`; gate on `useRootNavigationState().key`; replay a pending destination once the navigator is ready. |
| 5 | same as #1 | No pull-to-refresh anywhere — the only recovery was the full-screen "Try again" error path. | `RefreshControl` on all list screens. |

### Verify the changes

```bash
npm run typecheck:mobile
npx eslint apps/mobile/src
npm run test:mobile
npm run quality:mobile      # full gate: contracts + lint + tests + expo-doctor + release scan
```

### Manual smoke test (needs the backend + a device/simulator — see Part 3)

1. Explore: scroll to the bottom → next page loads → pull down → list refreshes.
2. Inbox / Trips / Favourites: same paging + refresh behaviour.
3. Chat: open a thread, scroll up for history; send from another account and confirm it appears within ~12 s.
4. Kill the app, tap a push notification → lands on the right screen exactly once.

---

## Part 2 — Known gaps NOT changed in this pass (deliberate)

These need product/owner decisions or a backend endpoint that does not exist yet.
Do **not** implement them blind.

- **Date entry in `booking/[listingId].tsx` is free-text `YYYY-MM-DD`.** A real date
  picker needs a dependency choice (`@react-native-community/datetimepicker` vs a
  calendar range picker) and an availability-aware UI. Tracked for Slice 3 polish.
- **Identity / licence upload is stubbed** (`profile.tsx` says so explicitly). This is
  Slice 5 and needs the protected-media endpoints.
- **No payment step.** `POST /reservations` creates a `REVIEWING` reservation; there is
  no `PaymentSheet`. This is Slice 6.
- **`role: string` typing** in `reservation/[reservationId].tsx` should be
  `"renter" | "owner"` — cosmetic, fix opportunistically.
- **`deviceMetadata()` reports `android` on web.** Harmless today (no web target for
  auth), leave until a web build is real.

---

## Part 3 — Step-by-step: the next implementation phase

Order: **(A) run it end-to-end → (B) Slice 5 uploads/location → (C) Slice 6 payments →
(D) test matrix → (E) store submission.** Each step has an exit gate; do not start the
next until the current gate passes on a real device.

### Step A — Stand up a working dev loop (0.5 day)

1. **Backend**, from repo root:
   ```bash
   cp .env.example .env.local          # then fill the MOBILE_* keys
   # generate the mobile access-token keypair (ES256):
   node -e "const {generateKeyPairSync}=require('crypto');const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'P-256'});console.log(JSON.stringify({privateKey:privateKey.export({type:'pkcs8',format:'pem'}),publicKey:publicKey.export({type:'spki',format:'pem'})}))"
   ```
   Put the private PEM in `MOBILE_ACCESS_TOKEN_PRIVATE_KEY`, the public PEM (as a JSON
   array keyed by `MOBILE_ACCESS_TOKEN_KEY_ID`) in `MOBILE_ACCESS_TOKEN_PUBLIC_KEYS`,
   set `MOBILE_REFRESH_TOKEN_PEPPER` to 32+ random bytes, and
   `MOBILE_ALLOW_AUTH_PREVIEWS=true` for local email-code previews.
   ```bash
   npm run dev                          # http://localhost:3000
   ```
2. **Mobile**, in `apps/mobile`, create `.env.local`:
   ```
   EXPO_PUBLIC_APP_ENV=development
   EXPO_PUBLIC_API_ORIGIN=http://<your-LAN-IP>:3000    # not localhost — the device needs to reach it
   ```
3. Build a dev client (Expo Go will not work — this app uses `expo-dev-client`,
   `expo-secure-store`, `expo-notifications`, native maps):
   ```bash
   cd apps/mobile
   npx expo run:ios          # or: eas build --profile development --platform ios
   npx expo start --dev-client
   ```

**Exit gate:** on one physical iPhone and one physical Android device you can register,
receive the email code (preview), log in, browse staging listings, open a listing,
save a favourite, and request a booking — with no server secret in the binary
(`npm run verify:mobile-release`).

### Step B — Slice 5: uploads, protected documents, location (3–5 days)

Backend first (no endpoint exists yet):

1. Add `POST /api/mobile/v1/uploads/grants` → returns a short-lived signed Cloudinary
   upload signature scoped to a folder + a server-side `assetId` placeholder. Never
   ship `CLOUDINARY_API_SECRET` to the client.
2. Add `POST /api/mobile/v1/me/licence` (and handover/incident equivalents) that
   accepts the finalized `assetId`, re-validates MIME/size/dimensions server-side, and
   sets ownership + `licenseStatus = PENDING`.
3. Serve licence/handover media only through `GET …/licence/media` that returns a
   ~60 s authorized URL. Add `Cache-Control: private, no-store`.
4. Extend the mobile contract (`packages/contracts/src/mobile/`) with the upload-grant
   and licence schemas; run `npm run typecheck:contracts`.

Mobile:

5. Add `expo-image-picker` + `expo-image-manipulator` usage behind an explicit
   "Add photo" / "Take photo" action (permission requested only on tap).
6. Client-side pre-checks: count, MIME, max dimension, size; resize/compress; strip
   EXCEPT orientation.
7. Upload UI: progress, cancel, retry, resume-after-background.
8. `profile.tsx`: replace the "unavailable" note with the real licence flow
   (upload → PENDING → VERIFIED/REJECTED states).
9. Location: only after a "Use my location" tap, request **foreground** location
   (`expo-location`); always keep suburb/manual search as the fallback.

**Exit gate:** denied / limited / later-revoked photo & location permissions each have
a usable fallback; an unauthorized licence media URL returns 401/403; backgrounding
mid-upload recovers.

### Step C — Slice 6: Stripe payments & owner onboarding (4–6 days)

> Physical-goods rule: the rental is **not** an in-app purchase. Re-read
> [App Review 3.1.3(e)](https://developer.apple.com/app-store/review/guidelines/#goods-and-services)
> and current Google Play payments policy before submitting.

Backend:

1. `POST /api/mobile/v1/reservations/[id]/payment-intent` — idempotently create/reuse
   the Stripe Customer + PaymentIntent for an `APPROVED` reservation; return
   `clientSecret` + `ephemeralKey` + `customerId`.
2. Treat the existing Stripe **webhook as the source of truth** for
   `paymentStatus`; the mobile success callback only triggers a refetch of
   `GET /reservations/[id]`.
3. `POST /api/mobile/v1/owner/connect/onboarding-link` — returns a Stripe-hosted
   Connect onboarding URL; `GET /api/mobile/v1/owner/connect/status` returns the
   server's view of the account.

Mobile:

4. Add `@stripe/stripe-react-native` (check the SDK ↔ Expo SDK 57 compat matrix),
   add its config plugin, rebuild the native app (not an OTA update).
5. Initialize with **only** `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
6. On the reservation screen, when `status === APPROVED && paymentStatus === PENDING`,
   present `PaymentSheet`. On completion → refetch, never optimistically show "paid".
7. Owner onboarding: open the Connect link in `expo-web-browser` auth session; on
   return, refetch Connect status from Redrive (ignore return-URL query params).
8. Handle: user cancel, delayed methods, 3DS, app termination mid-pay, webhook lag.

**Exit gate:** all Stripe test cards behave; a double "Pay" tap reuses the same
PaymentIntent; killing the app after payment still reconciles via webhook.

### Step D — Testing & quality gate (Section 12) (2–3 days)

1. Add unit tests for `useCursorList` paging math and for the booking
   quote/idempotency-fingerprint logic (`tsx --test`).
2. Run the **device & network matrix** from `expoGuide.md` §12.2: airplane mode
   mid-request, slow 3G, backgrounding, low storage, denied permissions, small and
   large screens, iOS Dynamic Type / Android font scale, VoiceOver / TalkBack on the
   auth + booking + payment paths.
3. Walk the **golden journeys** in §12.3 on real hardware.
4. `npm run quality:mobile` green; static web export green
   (`npx expo export -p web`); `npm run build` (web) green.

### Step E — Store submission (Sections 14–16)

Blocked on owner gates in `MOBILE_FOUNDATION_CHECKLIST.md` §3 — do these in parallel
with B/C:

- [ ] Confirm canonical production origin + stable preview origin.
- [ ] Confirm `au.com.redrive.app` availability in App Store Connect and Play Console.
- [ ] Org-owned Expo account/project; record `EXPO_PUBLIC_EAS_PROJECT_ID`.
- [ ] Apple Developer + Play Console org accounts and release roles active.
- [ ] APNs key / FCM credentials loaded into EAS for preview + production.
- [ ] Native Maps keys (`EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY` / `_ANDROID_KEY`),
      platform-restricted.
- [ ] Privacy / terms / account-deletion / support pages reviewed by AU legal.
- [ ] Complete `docs/mobile/DATA_RETENTION_MATRIX.md`; run the Mongo backup+restore
      drill; assign incident owners (`docs/mobile/SECURITY_RELEASE_GATE.md`).

Then:

```bash
# with production EXPO_PUBLIC_* + MOBILE_APPLE_TEAM_ID + MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS set
npm run verify:mobile-release -- --production
eas build --profile production --platform all
eas submit --profile production --platform ios      # TestFlight → App Store
eas submit --profile production --platform android   # internal track → production
```

---

## Quick reference — files touched in this review

```
apps/mobile/src/services/api/paginated.ts              (new)
apps/mobile/src/features/listings/explore-screen.tsx
apps/mobile/src/app/(app)/(tabs)/favourites.tsx
apps/mobile/src/app/(app)/(tabs)/inbox.tsx
apps/mobile/src/app/(app)/(tabs)/trips.tsx
apps/mobile/src/app/(app)/chat/[chatId].tsx
apps/mobile/src/app/+native-intent.tsx
apps/mobile/src/components/notification-navigation.tsx
```
