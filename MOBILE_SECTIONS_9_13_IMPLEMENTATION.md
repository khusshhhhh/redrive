# Redrive Sections 9–13 Implementation Record

**Started:** 25 August 2026  
**Scope:** `expoGuide.md` Sections 9–13  
**Rule:** repository checks may be marked complete here; device, credential,
provider, production, legal, and store checks remain open until evidenced.

## 1. Current outcome

Sections 9–13 are an incremental productization program rather than one binary
feature. This pass completed the shared safety and operational foundations that
later vertical slices depend on:

- allowlisted deep-link parsing for listing, trip, and message resources;
- native-intent rewriting that fails closed to the public home screen;
- server-generated Apple and Android association responses with strict
  identifier/fingerprint validation and no committed credentials;
- safe notification-tap routing using only a type and opaque resource ID;
- explicit, contextual notification permission and per-device registration UI;
- server-side push-token disablement on device logout and logout-all;
- native Security, device-session revocation, password change, login OTP, and
  permanent account-deletion screens;
- dedicated mobile unit tests, release-source/bundle secret scanning, a
  production environment validator, and one mobile quality command;
- a parameterized PowerShell local workflow for backend, dev-client, and checks;
- operational runbooks and a provisional retention matrix.

This does **not** claim that all six feature slices are store-ready. Payments,
protected upload UX, handover/incident UX, native map UX, owner booking controls,
push delivery credentials/receipts, and real-device gates remain open below.

## 2. Section 9 vertical-slice ledger

### Slice 1 — shell and public discovery: repository-ready, device gate open

Implemented:

- Expo Router shell, safe areas, theme tokens, shared controls, retry/error UI,
  five tabs, public browsing, protected route group, and return-path login;
- paginated/filter-capable public listing API with a redacted DTO;
- Explore and listing details against real backend data;
- no server secret in mobile source/config by design.

Still required:

- complete filter modal, multi-image gallery, review list, and approximate native
  map rather than the current compact listing detail;
- signed Preview build on one physical iPhone and one physical Android device;
- VoiceOver/TalkBack, large-text, reduced-motion, and low-memory checks.

### Slice 2 — registration, sign-in, and profile: core security complete

Implemented:

- registration, email verification, login, OTP challenge, rotating refresh,
  logout, logout-all, password recovery, session bootstrap, and safe expiry;
- Profile identity status, login-verification setting, password change,
  current/other device sessions, targeted revocation, and logout-all;
- account-deletion code request, consequence disclosure, exact `DELETE`
  confirmation, blocker recheck, permanent deletion, and local cache/session
  clearing after success;
- password change revokes web and mobile sessions; logout disables push tokens.

Still required:

- profile editing UI and protected licence capture/check UI;
- multi-device physical tests for refresh reuse, killed-app restore, password
  change, targeted revocation, and account deletion;
- SMTP delivery tests in the isolated Preview environment.

### Slice 3 — favourites, quotes, bookings, and trips: API-first partial

Implemented:

- idempotent favourites endpoints and favourites list;
- listing-level favourite add/remove with authenticated-action return routing and
  query-cache reconciliation;
- server-authoritative quote, reservation, reservation detail, owner status, and
  availability endpoints with integer-cent pricing and idempotency records;
- native booking request screen with date/protection selection, expiring
  itemized server quote, cancellation copy, optional renter message, and a
  stable idempotency key reused for identical submissions;
- renter/owner trip list and role-aware reservation detail foundation.

Still required:

- calendar-style native date controls, explicit licence-readiness display,
  booking confirmation polish, and network-loss/duplicate-tap device tests;
- owner approval/decline controls and availability calendar in the app;
- cancellation, payment-due, handover, and incident states.

### Slice 4 — chat, push, and deep links: foundation complete, delivery gate open

Implemented:

- inbox, participant-authorized paginated messages, idempotent send, unread data;
- per-device Expo token create/update/delete API;
- contextual permission screen—no launch-time permission prompt;
- notification response handler accepting only `listing`, `trip`, or `message`
  plus a valid opaque MongoDB ID;
- native deep-link parser restricted to configured HTTPS host/custom scheme and
  the same three resource routes; no link performs a mutation;
- authenticated destinations pass through the existing protected route guard.

Still required:

- FCM/APNs/EAS credentials and real delivery receipts;
- foreground polling/SSE cursor reconnection and message pagination UI;
- invalid-token receipt cleanup worker and complete event matrix on devices;
- signed-out, wrong-account, expired/deleted-resource, and cold-start device tests.

### Slice 5 — uploads, protected documents, and location: deliberately open

The SDK-compatible camera, image picker, and location packages are installed and
permission copy is configured. The user-facing slice remains disabled until the
mobile upload grant/finalization API, authorized media delivery, metadata
stripping, retention behavior, and denial/revocation tests are complete.

### Slice 6 — Stripe payments and owner onboarding: deliberately open

No publishable-key-only client is represented as a working payment flow yet.
Before enabling PaymentSheet, add an idempotent mobile payment-object endpoint,
install the Expo-compatible Stripe React Native package, configure merchant
identifiers/Google Pay, prove webhook reconciliation, and test termination,
authentication, cancellation, delay, and Connect universal-link return.

## 3. Section 10 deep links and association files

Routes accepted by the native parser:

| External path | Native destination | Authentication |
|---|---|---|
| `/listings/<24-hex-id>` | public listing detail | optional |
| `/trips/<24-hex-id>` | reservation detail | required |
| `/messages/<24-hex-id>` | conversation | required |

Everything else resolves to `/`. Extra path segments such as `/trips/id/approve`
are rejected so a link cannot perform or imply a destructive action.

Production server variables:

```text
MOBILE_APPLE_TEAM_ID
MOBILE_IOS_BUNDLE_ID=au.com.redrive.app
MOBILE_ANDROID_PACKAGE=au.com.redrive.app
MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS
```

The Next.js routes return `503` and `no-store` when these are missing or invalid;
they must return HTTPS `200` JSON in the deployed production environment before
the associated-domain gate can pass. Fingerprints may be comma-separated during
an intentional Android signing-key transition.

## 4. Section 11 local workflow

Prerequisites: Node 22.13+, npm, MongoDB access, populated ignored `.env`, and a
populated ignored `apps/mobile/.env.local` or equivalent shell values.

Terminal 1 — backend:

```powershell
.\scripts\mobile-local.ps1 -Target backend
```

Terminal 2 — dev client on the same computer:

```powershell
.\scripts\mobile-local.ps1 -Target mobile -ApiOrigin http://localhost:3000
```

Physical device on the private LAN (replace with the computer's actual LAN IP):

```powershell
.\scripts\mobile-local.ps1 -Target mobile -ApiOrigin http://192.168.1.50:3000
```

Android emulator:

```powershell
.\scripts\mobile-local.ps1 -Target mobile -ApiOrigin http://10.0.2.2:3000
```

The script rejects public clear-text origins. Use controlled HTTPS Preview for
auth redirects, universal/app links, payments, and release-representative tests.

### SDK 57 compatibility pin

On 25 August 2026, Expo Router/UI patch releases began requiring Gesture Handler
3.2, Reanimated 4.6, Screens 4.27, and Worklets 0.12, while Expo Doctor's SDK 57
direct-package manifest still reported the preceding native versions. Keeping
old direct versions produced duplicate native modules, which is unsafe. The app
therefore pins one coherent Router dependency set and temporarily records the
affected packages under `expo.install.exclude` so Doctor does not propose the
known-conflicting partial downgrade. Remove the exclusions only after Expo
publishes a mutually consistent matrix and the complete set passes a clean
install, Doctor, export, and signed development build; never update Router alone.

Focused repository gate:

```powershell
.\scripts\mobile-local.ps1 -Target checks -SkipInstall
```

Development builds still require the organization-owned Expo account:

```powershell
cd apps/mobile
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

## 5. Section 12 automated and manual quality gates

One focused command now runs Prisma generation, contracts/mobile TypeScript,
mobile lint, mobile tests, server tests, Expo Doctor, and source/bundle scanning:

```powershell
npm run quality:mobile
```

The repository-wide release sequence remains:

```powershell
npm run quality:mobile
git diff --check
npm run build
npx tsc --noEmit
npm exec --workspace @redrive/mobile -- expo export --platform web --output-dir dist-web --clear
npm run verify:mobile-release
```

Production configuration validation is intentionally separate and fails until
real owner-controlled values are supplied:

```powershell
$env:EXPO_PUBLIC_APP_ENV='production'
$env:EXPO_PUBLIC_API_ORIGIN='https://<production-domain>'
$env:EXPO_PUBLIC_LINK_HOST='<production-domain>'
$env:EXPO_PUBLIC_EAS_PROJECT_ID='<uuid>'
$env:MOBILE_APPLE_TEAM_ID='<team-id>'
$env:MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS='<sha256>'
npm run verify:mobile-release -- --production
```

Automated tests do not replace the device/network/accessibility matrix in
`expoGuide.md` Section 12.2 or the golden journeys in Section 12.3.

### Validation evidence from 25 August 2026

- `npm run quality:mobile`: passed contracts and mobile TypeScript, mobile
  lint, 6 mobile link/notification tests, 27 server/library tests, all 21 Expo
  Doctor checks, and the source/config release scan;
- Expo static web export: passed and generated 48 routes;
- post-export release scan: passed across 51 source/config/bundle files;
- `git diff --check`: passed (Git reported line-ending conversion notices only);
- `npm run build`: passed, including both `/.well-known` association routes and
  104 generated Next.js pages;
- `npx tsc --noEmit`: passed after the production build.

`npm audit --omit=dev` currently reports 11 moderate findings in Expo's
transitive `xcode -> uuid` toolchain. npm offers only a forced downgrade to Expo
46, which is a breaking and unsafe remediation for this SDK 57 workspace. The
finding is recorded for upstream review; `npm audit fix --force` was not run.

## 6. Section 13 security/privacy/operations status

Repository-enforced now:

- HTTPS required outside approved local/private origins;
- private key, Stripe secret, webhook secret, MongoDB credential, Cloudinary
  secret, refresh pepper, credential filename, and secret-shaped public variable
  scanning across mobile source/config and `dist-web` when present;
- strict Apple Team ID, Redrive bundle/package, and Android SHA-256 validation;
- no destructive deep link or notification action;
- server authorization remains authoritative for trip/chat content;
- explicit account deletion and public `/account-deletion` information;
- logout-linked push-token disablement.

Operational evidence still required before external testing:

- complete the owner-reviewed retention matrix;
- execute MongoDB backup and disposable restore drill;
- assign primary/secondary incident owners and escalation contacts;
- inspect the signed native binaries/config, not only JavaScript export;
- prove TLS, ownership/participant tests, log/crash redaction, provider deletion,
  signing-key rotation, lost-device response, and monitoring alerts;
- obtain qualified Australian legal/privacy review.

See `docs/mobile/SECURITY_RELEASE_GATE.md`,
`docs/mobile/SIGNING_KEY_ROTATION_RUNBOOK.md`, and
`docs/mobile/DATA_RETENTION_MATRIX.md`.
