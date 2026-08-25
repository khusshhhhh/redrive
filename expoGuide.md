# Redrive Expo/React Native Development and Store Release Guide

**Purpose:** step-by-step implementation and release handbook

**Companion document:** [`mobileImplement.md`](./mobileImplement.md)

**Sections 1–4 execution record:** [`MOBILE_FOUNDATION_CHECKLIST.md`](./MOBILE_FOUNDATION_CHECKLIST.md)

**Sections 5–8 implementation record:** [`MOBILE_SECTIONS_5_8_IMPLEMENTATION.md`](./MOBILE_SECTIONS_5_8_IMPLEMENTATION.md)

**Sections 9–13 implementation record:** [`MOBILE_SECTIONS_9_13_IMPLEMENTATION.md`](./MOBILE_SECTIONS_9_13_IMPLEMENTATION.md)

**Repository:** current Redrive Next.js/MongoDB application

**Last validated:** 25 August 2026

**Target:** iOS and Android, using the existing Redrive backend

This guide turns the architecture in `MOBILE_APP_IMPLEMENTATION_PLAN.md` into an implementation sequence. Follow it in order. Do not start store submission until the release gates near the end pass.

> Store rules, Expo SDKs, Android target API requirements, and portal labels change. The commands and links in this guide were checked on the validation date. Recheck the linked official documentation before each production submission.

### Guide map

- Sections 1–4: architecture, current backend readiness, decisions, accounts, and environments.
- Sections 5–8: Expo workspace, EAS configuration, versioned backend API, and mobile session client.
- Sections 9–13: feature-by-feature development, local workflow, testing, security, and privacy.
- Sections 14–16: store assets, Apple App Store upload, and Google Play upload.
- Sections 17–20: updates, rollback, go-live checklist, milestones, and official references.

## 1. The result we are building

The finished system has one backend and two clients:

```text
Existing browser app ─┐
                     ├── Next.js server + /api/mobile/v1 ── Prisma ── MongoDB
Expo iOS/Android app ┘                 │
                                      ├── Stripe and Stripe Connect
                                      ├── Cloudinary
                                      ├── Google Places/Maps
                                      ├── SMTP email
                                      └── Expo Push → APNs/FCM
```

Keep these boundaries throughout development:

- The existing Next.js app remains the web UI and backend deployment.
- The native app lives at `apps/mobile` and calls HTTPS endpoints under `/api/mobile/v1`.
- Pricing, availability, permissions, booking state, payment state, and sensitive-media authorization remain server-side.
- MongoDB credentials, Prisma, Stripe secrets, Cloudinary secrets, SMTP credentials, signing keys, and cron secrets never enter the mobile project.
- React web components are not copied into React Native. Share contracts, pure validation, design tokens, and business terminology instead.

## 2. Current repository reality

The backend already provides MongoDB/Prisma models for users, listings, reservations, booking quotes, payments, availability, reviews, chats, messages, notifications, handovers, incidents, and audit events. It also contains server logic for booking conflicts, pricing, protected location release, Stripe webhooks, uploads, email verification, OTP, and rate limiting.

It is **not yet safe to point a production mobile app directly at all existing routes**:

- NextAuth primarily authenticates browser cookies.
- `/api/auth/login` is a disabled legacy/testing endpoint. It creates only a short-lived JWT, uses `NEXTAUTH_SECRET`, has no refresh-token rotation, and deliberately rejects OTP-enabled accounts. Do not enable it for the app.
- `getCurrentUserEnhanced` understands a legacy bearer token, but that is compatibility behavior rather than a production mobile session design.
- Listings, reservations, notifications, availability, recommendations, Connect, handover, and incident routes have some bearer-aware code that can be refactored.
- Favourites, profile, profile security, uploads, protected files, reviews, saved searches, chat, presence, and `/api/auth/user` still depend on the web session.
- Public listing discovery is performed mainly through server actions; the mobile app needs an explicit, paginated `GET /api/mobile/v1/listings` contract.

The first engineering milestone is therefore a stable mobile API and token lifecycle, not screen-by-screen calls to arbitrary `/api/*` routes.

## 3. Decisions and accounts to finish first

Record the answers in the project issue or release checklist before generating store credentials:

| Decision | Recommended first release | Why it matters |
|---|---|---|
| Production API origin | Final HTTPS Redrive domain | Deep links, OAuth, Stripe returns, and store review depend on it |
| iOS bundle ID | `au.com.redrive.app` if owned/available | Effectively permanent after release |
| Android package | `au.com.redrive.app` if owned/available | Cannot be changed for the same Play listing |
| App display name | `Redrive` subject to store availability | Used in metadata and reviewer instructions |
| Owner scope | Manage reservations and availability; defer complex editor if needed | Controls version 1 size |
| Login | Email/password + email verification first | Avoids incomplete social-login obligations |
| Social login | Add Google and Apple together on iOS when enabled | Apple login rules can apply when third-party login is offered |
| Payment UI | Native Stripe PaymentSheet; hosted Connect onboarding | Appropriate for a physical rental service |
| Minimum OS versions | Decide from audience/device data | Changes build config and QA matrix |
| Tablet support | Explicitly support it or opt out honestly | Changes screenshots and layouts |
| Legal pages | Privacy, terms, support, deletion request | Required before store review |

Create organization-owned accounts where possible:

1. Expo organization/project.
2. Apple Developer Program and App Store Connect.
3. Google Play Console organization account.
4. Existing Stripe, Cloudinary, MongoDB Atlas, Google Cloud, SMTP, Vercel, and domain/DNS accounts with named business owners.
5. A password manager or approved secret manager for recovery codes and credential ownership. Never commit credential JSON, `.p8`, keystores, or environment files.

## 4. Prepare environments before app development

Use three isolated configurations:

| Environment | Mobile build | Backend/data | Purpose |
|---|---|---|---|
| Development | Local development client | Local/LAN or disposable development database | Fast engineering |
| Preview | Internally distributed signed app | HTTPS staging deployment and staging services | QA and stakeholder testing |
| Production | Store-signed build | Production deployment and production services | Customers |

At minimum, staging must not write test bookings, messages, uploads, or payments into production. Use a separate MongoDB database and Stripe test mode. Prefer separate Cloudinary folders or accounts and separate push credentials/projects as well.

### 4.1 Backend environment variables to add

Keep the existing variables documented in `.env.example` and add dedicated mobile server variables during backend implementation. Names can change during implementation, but their responsibilities must remain separate:

```dotenv
# Server only. Never EXPO_PUBLIC_*.
MOBILE_TOKEN_ISSUER=https://<production-domain>
MOBILE_TOKEN_AUDIENCE=redrive-mobile-api
MOBILE_ACCESS_TOKEN_PRIVATE_KEY=<PEM-or-managed-secret>
MOBILE_ACCESS_TOKEN_PUBLIC_KEYS=<key-id-to-public-key-map>
MOBILE_REFRESH_TOKEN_PEPPER=<independent-random-secret>

# Push delivery, server only where applicable.
EXPO_ACCESS_TOKEN=

# Canonical public links.
NEXT_PUBLIC_SITE_URL=https://<production-domain>
```

Use an asymmetric access-token algorithm such as RS256 or ES256 where the deployment setup supports safe key management. Include a key ID (`kid`) so signing keys can rotate. Do not reuse `NEXTAUTH_SECRET`, `RATE_LIMIT_SECRET`, Stripe secrets, or any other application secret.

### 4.2 Mobile build-time variables

Only values safe to extract from a compiled app can use the `EXPO_PUBLIC_` prefix:

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_ORIGIN=https://<staging-or-production-domain>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=
```

API origins, publishable keys, map keys, and DSNs are not secrets; restrict them at the provider and enforce security on the backend. EAS offers separate `development`, `preview`, and `production` environments. Its environment-variable behavior is documented in [Expo's EAS environment guide](https://docs.expo.dev/eas/environment-variables/).

## 5. Create the monorepo and Expo application

### 5.1 Create a branch and verify the web app

From the repository root:

```powershell
git switch -c feature/mobile-foundation
npm ci
npx prisma generate
npm run build
```

Fix baseline failures or record them before mobile changes so new failures are distinguishable.

### 5.2 Add npm workspaces

Update the root `package.json` without removing its existing scripts or dependencies:

```json
{
  "name": "redrive",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

Create these eventual shared packages only when their first real consumer exists:

```text
packages/contracts       runtime schemas, DTOs, and API types
packages/domain          pure platform-independent helpers
packages/design-tokens   colours, spacing, type scale, radii
```

Do not move Prisma or the existing Next.js app during the first slice. Keeping the deployed web paths stable reduces unrelated deployment risk.

### 5.3 Generate Expo

Expo's current project command on the validation date uses SDK 57. Check [Create an Expo project](https://docs.expo.dev/get-started/create-a-project/) immediately before running it, then pin the generated versions in the lockfile:

```powershell
npx create-expo-app@latest apps/mobile --template default@sdk-57
Set-Location apps/mobile
npx expo install expo-dev-client expo-secure-store expo-constants expo-device expo-linking expo-notifications expo-image expo-image-picker expo-camera expo-location expo-web-browser react-native-maps @react-native-async-storage/async-storage
npm install @tanstack/react-query zod react-hook-form @hookform/resolvers
```

Add Stripe when implementing payments, not before:

```powershell
npx expo install @stripe/stripe-react-native
```

Use `npx expo install` for packages with native peer-version requirements. Run `npx expo-doctor` after dependency changes.

### 5.4 Adopt this mobile structure

```text
apps/mobile/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── (public)/
│   │   │   ├── index.tsx
│   │   │   └── listing/[listingId].tsx
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── verify-email.tsx
│   │   │   └── forgot-password.tsx
│   │   └── (app)/
│   │       ├── _layout.tsx
│   │       ├── (tabs)/
│   │       │   ├── explore.tsx
│   │       │   ├── favourites.tsx
│   │       │   ├── trips.tsx
│   │       │   ├── inbox.tsx
│   │       │   └── profile.tsx
│   │       ├── reservation/[reservationId].tsx
│   │       └── chat/[chatId].tsx
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── listings/
│   │   ├── bookings/
│   │   ├── chat/
│   │   ├── owner/
│   │   └── profile/
│   ├── services/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── links/
│   │   ├── push/
│   │   └── uploads/
│   ├── providers/
│   ├── hooks/
│   └── theme/
├── assets/
├── app.config.ts
├── eas.json
├── package.json
└── tsconfig.json
```

If the generated SDK template uses `src/app`, retain it. Keep routing files thin; feature folders should own queries, mutations, forms, and reusable native components.

## 6. Configure app identity, variants, and EAS

Use a dynamic `app.config.ts` so development and preview can coexist with production on one device. Replace all placeholders only after the IDs are approved:

```ts
import type { ConfigContext, ExpoConfig } from "expo/config";

const variant = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
const isProduction = variant === "production";
const suffix = isProduction ? "" : `.${variant}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isProduction ? "Redrive" : `Redrive ${variant}`,
  slug: "redrive",
  scheme: isProduction ? "redrive" : `redrive-${variant}`,
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    bundleIdentifier: `au.com.redrive.app${suffix}`,
    supportsTablet: false,
    associatedDomains: ["applinks:<production-domain>"],
    infoPlist: {
      NSCameraUsageDescription: "Redrive uses the camera when you choose to photograph a vehicle, licence, handover, or incident.",
      NSPhotoLibraryUsageDescription: "Redrive lets you choose photos for listings, identity checks, handovers, and incidents.",
      NSLocationWhenInUseUsageDescription: "Redrive uses your location only when you choose to search for nearby vehicles."
    }
  },
  android: {
    package: `au.com.redrive.app${suffix}`,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    intentFilters: [{
      action: "VIEW",
      autoVerify: true,
      data: [{ scheme: "https", host: "<production-domain>", pathPrefix: "/" }],
      category: ["BROWSABLE", "DEFAULT"]
    }]
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications",
    ["expo-image-picker", {
      photosPermission: "Allow Redrive to select photos you choose to upload.",
      cameraPermission: "Allow Redrive to take photos you choose to upload."
    }]
  ],
  extra: {
    apiOrigin: process.env.EXPO_PUBLIC_API_ORIGIN,
    eas: { projectId: "<eas-project-id>" }
  }
});
```

Permission text must describe the actual feature. Remove unused permissions and plugins rather than declaring them speculatively.

Configure EAS from `apps/mobile`, because Expo requires monorepo EAS commands to run from the app directory. See [Expo's monorepo build guide](https://docs.expo.dev/build-reference/build-with-monorepos/).

```powershell
Set-Location apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```

Use an `eas.json` similar to:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "channel": "preview"
    },
    "production": {
      "environment": "production",
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "draft"
      },
      "ios": {
        "ascAppId": "<app-store-connect-numeric-app-id>"
      }
    }
  }
}
```

Recheck supported `eas.json` fields and the installed EAS CLI before committing; the schema evolves. Do not hard-code credentials in this file.

For preview deep-link testing, either use a staging domain with association files for the preview bundle/package IDs, or include those signed preview identities in the appropriate association files. Do not expect a production-only Apple/Android association entry to verify a suffixed preview app.

## 7. Build `/api/mobile/v1` before authenticated screens

Keep mobile transport code separate from reusable business services. A practical backend layout is:

```text
app/api/mobile/v1/               Next.js route handlers only
app/libs/mobile-auth/            token issue/verify, refresh rotation, challenges
app/libs/mobile-api/             response envelope, request IDs, pagination, idempotency
app/services/                    shared booking/payment/chat/upload behavior
packages/contracts/src/mobile/  runtime request/response schemas and exported DTO types
```

Route handlers should parse and validate input, resolve identity, call a service, and serialize a DTO. They should not duplicate booking calculations or call the old HTTP routes internally.

### 7.1 Create shared response contracts

In `packages/contracts`, define Zod schemas for requests, successful DTOs, pagination, and errors. Never expose raw Prisma records by default.

Use one error shape:

```json
{
  "error": {
    "code": "DATES_UNAVAILABLE",
    "message": "Those dates are no longer available.",
    "requestId": "req_...",
    "fields": {
      "startDate": "Choose another date."
    }
  }
}
```

Rules:

- Stable `code` values drive app behavior; display-safe `message` values help users.
- Attach a request ID to response headers and error bodies.
- Serialize dates as ISO 8601 UTC strings and money as integer cents plus an ISO currency.
- Use cursor pagination rather than returning unlimited collections.
- Return no password hash, token hash, provider token, exact private address, Cloudinary public ID, Stripe secret/object internals, or admin-only field.
- Version breaking changes under a future `/api/mobile/v2`; installed v1 clients must keep working.

### 7.2 Add a real mobile session model

Do not overload the current legacy API token. Either extend `UserSession` with explicit token-family fields after confirming it is not used incompatibly, or add a dedicated `MobileSession` model. A dedicated model is clearer:

```prisma
model MobileSession {
  id               String    @id @default(auto()) @map("_id") @db.ObjectId
  userId           String    @db.ObjectId
  tokenFamilyId    String
  refreshTokenHash String    @unique
  deviceId         String
  deviceName       String?
  platform         String
  appVersion       String?
  lastSeenAt       DateTime  @default(now())
  expiresAt        DateTime
  rotatedAt        DateTime?
  revokedAt        DateTime?
  revokeReason     String?
  createdAt        DateTime  @default(now())

  @@index([userId, revokedAt, lastSeenAt])
  @@index([tokenFamilyId, revokedAt])
  @@index([expiresAt])
}
```

Because this repository uses Prisma with MongoDB, validate against a staging database and use the repository's MongoDB-safe schema deployment process (normally `npx prisma db push`, not a relational migration assumption). Back up first and inspect generated changes.

Session behavior:

1. Generate an opaque refresh token with at least 256 bits of secure randomness.
2. Return the raw refresh token once; store only its peppered cryptographic hash.
3. Issue an audience-restricted access token for about 10 minutes.
4. Rotate the refresh token on every successful refresh.
5. If an already-rotated token is reused, revoke the whole token family and require sign-in.
6. Revoke the device session on logout.
7. Revoke all mobile sessions after password reset/change, account deletion, or `logout-all` as policy requires.
8. Audit login, refresh-token reuse, logout-all, password changes, and deletion.

### 7.3 Implement authentication endpoints

Create these server routes:

```text
POST   /api/mobile/v1/auth/register
POST   /api/mobile/v1/auth/verify-email
POST   /api/mobile/v1/auth/resend-verification
POST   /api/mobile/v1/auth/login
POST   /api/mobile/v1/auth/login/verify-otp
POST   /api/mobile/v1/auth/refresh
POST   /api/mobile/v1/auth/logout
POST   /api/mobile/v1/auth/logout-all
POST   /api/mobile/v1/auth/forgot-password
POST   /api/mobile/v1/auth/reset-password
GET    /api/mobile/v1/me
PATCH  /api/mobile/v1/me
DELETE /api/mobile/v1/me
```

If deletion is asynchronous because data must be checked, retained, or anonymized, `DELETE /me` should create an auditable deletion request and return `202 Accepted` with a safe status contract. The in-app copy and public deletion page must accurately describe the process and expected timing.

Recommended login exchange:

```text
POST /auth/login
  email + password + device metadata
    ├── normal account → accessToken + refreshToken + user
    └── OTP enabled    → 202 + challengeId + code LOGIN_OTP_REQUIRED

POST /auth/login/verify-otp
  challengeId + otp + device metadata
    └── accessToken + refreshToken + user
```

Keep the existing verification, password hashing, generic invalid-credential response, IP/account rate limits, OTP attempt limits, and audit behavior. Never return preview OTP codes outside an explicitly controlled local/test environment.

The access-token verifier must check signature, `kid`, issuer, audience, expiry, not-before time if used, subject/user ID, session ID, and relevant revocation/password-change state. A valid token authenticates a user; each route must still authorize ownership or participation in the requested object.

### 7.4 Refactor server authorization once

Create a server-only helper with a shape such as:

```ts
type RequestIdentity = {
  userId: string;
  method: "web-session" | "mobile-access-token";
  sessionId?: string;
};

async function requireIdentity(request: Request): Promise<RequestIdentity>;
async function optionalIdentity(request: Request): Promise<RequestIdentity | null>;
```

It should accept the existing NextAuth web session or the new mobile access token. Migrate current routes to it while preserving web behavior. Do not continue growing two unrelated authorization implementations.

Add integration tests for every protected endpoint covering:

- no credentials → `401`;
- invalid/expired/revoked token → `401`;
- valid user but wrong owner/participant → `403` or privacy-safe `404`;
- valid authorized user → expected response;
- web session still works where the browser app uses the route.

### 7.5 Add mobile resource endpoints

Build mobile controllers over shared domain services rather than making one Next.js route call another over HTTP.

| Mobile endpoint group | Existing logic to reuse/refactor | Required work |
|---|---|---|
| `GET /listings`, `GET /listings/:id` | listing actions/routes | Add filters, cursor pagination, safe public DTO, approximate location |
| `/favourites` | favourites route | Replace web-session-only auth; make add idempotent and prevent duplicates |
| `/saved-searches` | saved-search routes | Replace web-session-only auth; validate and paginate |
| `/reservations/quote`, `/reservations` | booking helpers and reservation routes | Keep server prices/conflict checks; add idempotency keys |
| `/reservations/:id/*` | detail, status, checkout, handover, incidents | Enforce renter/owner role and status transitions |
| `/chats`, `/chats/:id/messages` | chat serializers/routes | Bearer auth, cursor pagination, participant checks |
| `/notifications` | notification routes | Push registration, pagination, bulk read/delete |
| `/devices/push-tokens` | new mobile capability | Register/refresh/revoke per-device Expo push tokens |
| `/uploads/*` | upload and protected-file routes | Bearer auth, MIME/size checks, signed grants or multipart uploads |
| `/me`, `/me/security` | auth user/profile routes | Mobile DTO, reauthentication for destructive changes |
| `/owner/listings/:id/availability` | availability routes | Owner checks and conflict rules |
| `/payments/*` | checkout/webhook/Connect routes | PaymentSheet object, idempotency, verified app return |

Use an `Idempotency-Key` header for booking requests, payment creation, upload finalization, approvals/declines, and other retry-sensitive mutations. Store the key, authenticated actor, normalized request hash, status, and response for a bounded period. Reject reuse with different request content.

## 8. Implement the mobile session and API client

### 8.1 Token storage rules

- Store the refresh token and non-secret device-session identifier in `expo-secure-store`.
- Keep the access token in memory; replace it after refresh.
- Cache ordinary non-sensitive query data with TanStack Query persistence only after deciding which records may live on disk.
- Do not store licence photos, chat bodies, access tokens, exact pickup addresses, or payment details in AsyncStorage.
- On logout, call the server first when online, then clear local tokens and all user-scoped caches. If offline, clear locally and record only the minimum safe revocation task.

### 8.2 Build one request wrapper

The API layer should:

1. Join paths to `EXPO_PUBLIC_API_ORIGIN` safely.
2. Add `Accept: application/json`, an app version, platform, and a unique request ID.
3. Add the in-memory access token.
4. On one `401`, perform a single shared refresh operation so concurrent failures do not rotate the token multiple times.
5. Retry the original request once after refresh.
6. If refresh fails, clear the session and navigate to sign-in while preserving a safe return path.
7. Parse the stable error envelope and never show raw server exceptions.
8. Use abort signals and sensible timeouts.
9. Retry only safe/idempotent operations with bounded exponential backoff and jitter.

Do not put automatic booking, payment, approval, cancellation, or handover retries in a general interceptor.

### 8.3 Session bootstrap

On app startup:

```text
show native splash
  → read refresh token from SecureStore
    → no token: enter public navigation
    → token: call /auth/refresh
      → success: set access token, fetch /me, enter signed-in navigation
      → failure: clear local state, enter public navigation
hide splash after the route decision
```

Protected route groups should render only after bootstrap finishes. A navigation guard is user experience, not authorization; the backend remains authoritative.

## 9. Develop screens in vertical slices

> **Execution record:** repository implementation status, commands, completed
> controls, and deliberately open device/provider gates are maintained in
> [`MOBILE_SECTIONS_9_13_IMPLEMENTATION.md`](./MOBILE_SECTIONS_9_13_IMPLEMENTATION.md).

For each slice, finish API contract, loading/empty/error/offline states, accessibility, tests, analytics redaction, and real-device checks before moving on.

### Slice 1: shell and public discovery

1. Create theme tokens, safe-area layout, typography, buttons, form fields, cards, skeletons, retry panel, and error boundary.
2. Add the five main tabs: Explore, Favourites, Trips, Inbox, Profile.
3. Build `GET /api/mobile/v1/listings` with cursor pagination and filters.
4. Build Explore, filter modal, listing details, image gallery, reviews summary, and approximate map.
5. Permit browsing without login; redirect to login only when the user starts an authenticated action.
6. Preserve the intended route so sign-in returns the user to the same listing/action.

Exit gate: a signed preview build browses staging data on one iPhone and one Android device without any server secret in the binary.

### Slice 2: registration, sign-in, and profile

1. Build registration and email verification.
2. Implement login, OTP challenge, token refresh, logout, logout-all, forgot/reset password, and expired-session handling.
3. Add Profile and Security screens.
4. Add in-app account-deletion initiation with reauthentication, clear consequences, confirmation, and status/result messaging.
5. Test password changes and account deletion against multiple device sessions.

Exit gate: token rotation/reuse tests pass; a killed app restores a valid session; revoked and expired sessions fail safely.

### Slice 3: favourites, quotes, bookings, and trips

1. Make favourites idempotent and cache-aware.
2. Fetch availability and a short-lived server quote.
3. Display itemized integer-cent pricing and quote expiry.
4. Require valid licence state before booking, matching server behavior.
5. Submit a booking with an idempotency key.
6. Build renter and owner trip lists and role-aware reservation details.
7. Add owner approve/decline and availability blocking using explicit status transitions.
8. Refetch after every status mutation; do not optimistically claim a booking/payment succeeded.

Exit gate: duplicate taps and network loss cannot create duplicate bookings or invalid status transitions.

### Slice 4: chat, push, and deep links

1. Add inbox summaries and cursor-paginated message history.
2. Start with foreground polling or a bearer-authenticated SSE client with tested reconnection cursors. Do not expect background sockets to remain alive.
3. Register an Expo push token only after explaining value and obtaining notification permission at a useful moment.
4. Add authenticated create/update/delete endpoints under `/api/mobile/v1/devices/push-tokens` and store multiple device tokens per user with platform, app environment, last seen, and disabled/invalid state.
5. Send notification data containing only a type and opaque resource ID; fetch authorized content after opening.
6. Remove invalid push tokens based on delivery receipts.
7. Route notification taps through one validated deep-link parser.

Test new message, booking request/approval/decline/cancellation/payment due, pickup reminder, review reminder, and security alert. If signed out or signed into the wrong account, show a safe screen instead of leaking content.

### Slice 5: uploads, protected documents, and location

1. Request camera/photo permission only after a user selects the corresponding action.
2. Support camera and single/multiple picker as the feature requires.
3. Validate count, MIME type, dimensions, and size in the app for quick feedback, then validate again on the server.
4. Resize/compress large images and strip unnecessary metadata.
5. Show progress, cancellation, retry, and recovery after backgrounding.
6. Use authenticated uploads or short-lived signed upload grants. The server finalizes ownership.
7. Serve licence/handover media through short-lived authorized URLs and avoid general image caches.
8. Ask for foreground location only after `Use my location`; always retain suburb/manual search.

Exit gate: denied, limited, and later-revoked permissions have usable fallbacks; unauthorized media URLs do not work.

### Slice 6: Stripe payments and owner onboarding

Redrive rents physical vehicles, so the rental payment is not a digital in-app purchase. Apple's current guideline requires non-IAP payment methods for physical goods/services consumed outside the app; review [App Review Guideline 3.1.3(e)](https://developer.apple.com/app-store/review/guidelines/#goods-and-services). Confirm current Google Play payment policy before submission.

1. Backend creates/reuses the Stripe Customer and PaymentIntent/PaymentSheet data idempotently.
2. Mobile initializes Stripe with only the publishable key and merchant configuration.
3. Present PaymentSheet; never collect raw card details on Redrive servers.
4. Treat the Stripe webhook as payment truth. The phone's success callback triggers a status refetch only.
5. Handle cancellation, delayed methods, authentication, app termination, and webhook delay.
6. Open owner Connect onboarding in the authenticated system browser and return through a verified universal/app link.
7. On return, refetch Connect status from Redrive rather than trusting query parameters.

When enabling Apple Pay or Google Pay, add the Stripe config plugin settings required by the installed SDK version, configure the Apple merchant identifier and Google Pay flag, and rebuild the native app. Similarly, add platform-restricted native Maps keys under the Expo iOS/Android config and configure APNs/FCM credentials when those slices begin. These are native configuration changes, so an over-the-air JavaScript update is not sufficient.

Exit gate: Stripe test scenarios pass, duplicate payment attempts reuse the correct server object, and webhook reconciliation is proven.

## 10. Deep links and domain files

Prefer HTTPS links such as:

```text
https://<production-domain>/listings/<listingId>
https://<production-domain>/trips/<reservationId>
https://<production-domain>/messages/<chatId>
https://<production-domain>/verify-email?token=<single-use-token>
https://<production-domain>/reset-password?token=<single-use-token>
```

Use the private `redrive://` scheme only for controlled provider callbacks or a fallback. Validate route names, parameter types, authentication state, account ownership, expiry, and allowed hosts. Never perform a destructive action merely by opening a link.

Publish from the production domain:

- `/.well-known/apple-app-site-association`, with the Apple Team ID and production bundle ID;
- `/.well-known/assetlinks.json`, with the production Android package and Play App Signing SHA-256 certificate fingerprint.

Serve both as HTTPS `200` responses without redirects and with the correct JSON content type. Test release-signed builds for installed/signed-in, installed/signed-out, wrong account, expired link, and app-not-installed cases.

## 11. Local development workflow

### 11.1 Run the backend

From the repository root:

```powershell
npm install
npx prisma generate
npm run dev
```

Never configure a physical phone with `http://localhost:3000`; on the phone, localhost means the phone. Options:

- Android emulator can normally reach the host at `http://10.0.2.2:3000`.
- An iOS simulator on macOS can normally use the host's localhost.
- A physical device can use the computer's LAN IP when the firewall and network allow it.
- Prefer a controlled HTTPS development/staging URL when testing auth redirects, deep links, payments, or iOS transport security.

Do not weaken production App Transport Security or Android clear-text settings to make local development convenient.

### 11.2 Create and run development builds

From `apps/mobile`:

```powershell
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

EAS can build iOS in the cloud from Windows, although an Apple account and registered devices/credentials are still required. A local iOS Simulator and Xcode require macOS. Use Expo Go only for very early UI work; Stripe, notifications, native configuration, and release behavior require a development build.

## 12. Testing and quality gates

### 12.1 Automated coverage

Add these layers:

- Contract tests: every client request/response matches `packages/contracts`.
- Unit tests: deep-link parser, session reducer, token refresh coordination, money/date formatting, permission-state reducers, and pure booking helpers.
- API integration tests: disposable/staging database; authentication, authorization, validation, pagination, idempotency, and redaction.
- React Native component tests: login/OTP, quote expiry, destructive confirmations, denied permissions, and error states.
- End-to-end tests with Maestro or Detox: the golden journeys on Android and iOS.
- Existing web regression tests: browser login, listings, booking, payment, and chat remain functional after authorization refactors.

CI should run formatting, TypeScript, lint, unit/integration tests, contract compatibility, `npx expo-doctor`, secret scanning, dependency review, and both web/mobile builds at appropriate stages.

### 12.2 Mandatory device and network checks

Test at least:

- one older supported and one current iPhone;
- one lower/mid-range and one current Android;
- Wi-Fi, mobile data, slow connection, offline, reconnect, background, killed app, and expired session;
- fresh install, app upgrade, logout/login, password change, and device restore behavior;
- camera/photos/location/notifications granted, denied, limited where supported, and revoked later;
- large text, VoiceOver, TalkBack, reduced motion, dark mode, keyboard avoidance, and touch targets;
- Stripe test cards and redirect flows, cancellation, delayed webhook, duplicate tap, and termination mid-payment;
- TestFlight and Google Play internal/closed builds, not only local development clients.

### 12.3 Golden release journeys

1. Browse → listing → register → verify email → return to listing.
2. Upload licence → quote → request → owner approval → pay → trip details.
3. Message → push → open correct authorized chat.
4. Owner Connect onboarding → return → refresh payout readiness.
5. Pickup/return handover → protected media → both-party agreement.
6. Password reset → required sessions revoked → sign in again.
7. Account deletion request → confirmation → documented delete/anonymize/retain outcome.

## 13. Security, privacy, and operational gate

Before external testing:

- Inspect the built JS bundle and native configuration for secrets.
- Verify all traffic uses TLS and production builds reject clear text.
- Confirm every object endpoint checks ownership/participation.
- Redact tokens, licence details, exact addresses, message bodies, payment identifiers, and password/reset data from logs, analytics, and crash reports.
- Define retention and deletion for MongoDB, Cloudinary, Stripe, email, Expo push, and monitoring systems.
- Publish privacy, terms, support, and deletion pages at stable HTTPS URLs.
- Add a public web deletion route such as `/account-deletion` that names Redrive, accepts a deletion request without requiring the app to be reinstalled, explains identity verification, and states what is deleted or lawfully retained.
- Add in-app account deletion. Google also requires a discoverable web deletion-request resource; see [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
- Create a tested mobile signing-key rotation and lost-device/logout-all runbook.
- Back up MongoDB and run the existing restore drill before schema deployment.
- Configure crash/health alerts and identify the person who owns production incidents.

Use OWASP MASVS as the mobile security checklist. Obtain qualified Australian legal/privacy advice for identity documents, consumer/rental obligations, payment records, retention, insurance, and tax. This guide is engineering guidance, not legal advice.

## 14. Prepare store assets and reviewer material

Prepare one source-of-truth release folder outside the app bundle containing:

- app name, subtitle/short description, full description, keywords where supported, category, and age/content answers;
- 1024×1024 master icon without unintended transparency, Android adaptive foreground/background, splash assets, and store feature graphic;
- current screenshots captured from the release candidate with realistic staging/demo data and no private user information;
- public privacy-policy URL, terms URL, support URL, marketing URL if used, and deletion-request URL;
- support email/phone/address required by the selected stores/account type;
- release notes;
- data inventory for Apple App Privacy and Google Data safety;
- permission explanations;
- export-compliance/encryption answers reviewed by the business;
- a stable reviewer renter account and owner account, representative listing/reservation/chat data, OTP instructions or a deterministic review procedure, and contact details;
- reviewer notes explaining that Redrive brokers physical vehicle rentals, Stripe handles payment, how to reach gated screens, and why each sensitive permission is requested.

Apple accepts one to ten screenshots per supported device size/language according to its current [screenshot guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots). Check current pixel requirements in App Store Connect rather than encoding sizes permanently in this guide.

EAS Submit uploads the binary; it does **not** complete store metadata, screenshots, privacy forms, review notes, phased rollout, or final release controls. Expo confirms this distinction in its [store submission overview](https://docs.expo.dev/deploy/submit-to-app-stores/).

## 15. Apple App Store: step-by-step upload and release

### 15.1 Enrol and configure identifiers

1. Enrol the correct legal entity in the Apple Developer Program and complete agreements, tax, banking, contact, and D-U-N-S requirements that apply.
2. In Certificates, Identifiers & Profiles, register the final production bundle ID.
3. Enable only capabilities the release uses, including Associated Domains, Push Notifications, Sign in with Apple, and Apple Pay when applicable.
4. Configure APNs/Expo notification credentials, Apple merchant ID/payment processing certificate if Apple Pay is included, and the production association file.
5. If Google or another third-party primary login is exposed, implement the equivalent privacy-preserving login option required by current [App Review Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services), unless a documented exception applies.

### 15.2 Create the App Store Connect record

Before uploading, create the app record. Apple's [official record guide](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/) requires the platform, name, primary language, bundle ID, SKU, and access settings.

1. App Store Connect → Apps → `+` → New App.
2. Choose iOS, final name, primary language, registered bundle ID, and an internal SKU such as `REDRIVE-IOS-001`.
3. Select the correct team access.
4. Note the numeric Apple ID for `eas.json` `ascAppId`.
5. Complete App Information, category, content rights, age rating, pricing/availability, and all required agreements.

### 15.3 Build the production IPA

From `apps/mobile`:

```powershell
npx expo-doctor
npx eas-cli@latest build --platform ios --profile production
```

Let EAS manage certificates/profiles only if the organization accepts that credential model and account roles are correct. Otherwise provide organization-managed credentials through the approved secure process. Verify the build's bundle ID, version, build number, environment, API origin, entitlements, icon, and privacy manifest output.

Expo's current [EAS Build setup](https://docs.expo.dev/build/setup/) produces a store-ready binary and supports cloud iOS builds. Store credentials remain owned by the business.

### 15.4 Upload to App Store Connect

Recommended EAS path:

```powershell
npx eas-cli@latest submit --platform ios --profile production --latest
```

Use a least-privileged App Store Connect API key where possible. Upload is not App Review submission. Wait for Apple to process the build, then resolve any signing, entitlement, privacy-manifest, or export-compliance warnings. Apple's [upload documentation](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds) explains that bundle ID/version associate the build and every build string must be unique.

### 15.5 Test with TestFlight

1. Add internal testers and complete beta review information.
2. Exercise all golden journeys against staging or the explicitly prepared review environment.
3. Add a small external testing group after internal stability; complete Beta App Review if requested.
4. Monitor crashes, hangs, network errors, and reviewer-account health.
5. Build a new binary for native/config changes; do not reuse an old build number.

### 15.6 Complete the version page

1. Add description, keywords, support URL, privacy URL, promotional text if used, screenshots, and release notes.
2. Complete App Privacy using the actual app and third-party SDK data flows.
3. Answer age rating, advertising identifier/tracking, content rights, encryption/export compliance, and regional compliance accurately.
4. Select the processed build.
5. Add review contact, renter/owner credentials, OTP instructions, attachment if useful, and precise review notes.
6. State that rental payments cover physical services outside the app and identify the path reviewers should test.
7. Confirm the backend, media, email, push, and payment test flows will remain available for the entire review.

### 15.7 Submit and release

1. Resolve every blocking metadata warning.
2. Choose manual, automatic, or phased release based on the incident plan; manual release is safer for version 1.
3. Add the version for review and submit it. Apple's current two-stage action is documented in [Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app).
4. Monitor messages daily and respond with reproducible steps and a new build when code changes are required.
5. After approval, release during a staffed support window.
6. Verify the live listing, install from the public App Store, run smoke tests, and monitor backend/payment/crash health.

## 16. Google Play Store: step-by-step upload and release

### 16.1 Create and verify the app/account

1. Complete organization identity and contact verification in Play Console.
2. Play Console → Home → Create app.
3. Choose default language, app name, app (not game), free/paid status, contact email, declarations, and Play App Signing terms. Google's current flow is in [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).
4. Confirm the final package name before first upload.
5. Use Play App Signing and securely retain the upload-key recovery information.

### 16.2 Complete App content and store listing

From the dashboard, complete every applicable task:

- Main store listing: name, short/full descriptions, icon, phone/tablet screenshots as supported, feature graphic, category/tags, and contact details.
- Privacy policy.
- App access: working reviewer credentials and instructions for OTP/gated roles.
- Ads declaration.
- Content rating questionnaire.
- Target audience and content.
- News/health/financial or other special declarations only if applicable.
- Data safety based on code and SDK behavior. Google requires the form for closed/open/production testing; see [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
- Account deletion: declare the in-app path and public web deletion-request URL.
- Permissions declarations if Play flags sensitive/restricted permissions.

Do not guess Data safety answers from package names alone. Trace actual collection, transmission, sharing, encryption, deletion, optionality, and purposes across Redrive, Expo, Stripe, Google, Cloudinary, email, and monitoring.

### 16.3 Configure submission access

For automated EAS submission:

1. Create a dedicated Google Cloud service account following Expo/Play instructions.
2. Grant only the Play Console permissions needed to upload/manage releases for this app.
3. Store the service-account JSON in the approved secret store and upload it to EAS credentials; never commit it.
4. From `apps/mobile`, run `npx eas-cli@latest credentials --platform android` and select the production profile/service-account option when needed.

Expo's current [Android submission guide](https://docs.expo.dev/submit/android/) documents service-account setup and submission behavior.

### 16.4 Build and upload the AAB

```powershell
npx expo-doctor
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --profile production --latest
```

A production store build must be an Android App Bundle (`.aab`), not a development APK. Keep the first EAS submission in the internal track/draft until Play setup is complete. Verify package name, version name/code, target SDK, signing certificates, environment/API origin, permissions, deep links, icon, and mapping/deobfuscation artifacts where used.

### 16.5 Test through Play tracks

1. Add internal testers and publish the internal release.
2. Install only through the tester link and run the golden journeys.
3. Move to a closed test with representative devices/users.
4. Satisfy any testing duration and tester-count requirements shown for the actual developer account. Newer personal accounts can have additional production-access requirements; do not assume an organization account or older account has the same workflow.
5. Review pre-launch reports, Android vitals, crashes/ANRs, accessibility findings, security alerts, and policy warnings.
6. Fix issues with a new unique version code.

Google documents internal, closed, and open tracks in [Set up a test](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).

### 16.6 Promote to production

1. Confirm all dashboard and App content tasks are complete.
2. Recheck the current target API policy immediately before building.
3. Create/promote the tested release to production.
4. Add customer-facing release notes.
5. Resolve warnings and submit changes for review.
6. Use Managed publishing if the team needs approval before an accepted change goes live.
7. Start with a staged rollout, such as 5–10%, during a staffed window; increase only when crash, ANR, API, booking, and payment metrics are healthy.
8. Install the public Play build and run production smoke tests.

Play review may take several days or longer for some accounts/releases. Do not schedule a fixed marketing launch until both stores have accepted the release.

## 17. Versioning, updates, rollback, and hotfixes

Use semantic customer versions (`1.0.0`, `1.0.1`) and unique monotonically increasing iOS build/Android version codes. With EAS remote versioning and `autoIncrement`, verify the resolved numbers in every build.

EAS Update may ship compatible JavaScript/assets to an existing binary, but it is not appropriate when changing:

- native dependencies or config plugins;
- permissions, entitlements, bundle/package identity, native SDKs, or privacy manifests;
- behavior that store rules require to be reviewed in a new binary;
- runtime contracts incompatible with installed builds.

Pin a runtime-version policy, maintain separate development/preview/production channels, test an update in preview first, and document rollback. The backend must remain backward-compatible with all supported installed app versions. Add a server-controlled minimum-supported-version response only for genuinely unsafe/incompatible clients, with a functional store-update screen.

For a production incident:

1. Stop rollout or pause release where the store allows it.
2. Disable the affected server feature with an audited flag when safe.
3. Decide whether rollback, EAS Update, or a new binary is valid.
4. Protect booking/payment consistency before UI convenience.
5. Communicate status through support channels and preserve incident evidence.

## 18. Final go-live checklist

### Code and backend

- [ ] `/api/mobile/v1` contracts are versioned, validated, documented, and tested.
- [ ] Refresh tokens rotate; reuse revokes the family; logout/logout-all work.
- [ ] Every protected object has server-side authorization tests.
- [ ] Booking/payment/status mutations are idempotent.
- [ ] Web regression tests pass.
- [ ] Staging and production data/services are isolated.
- [ ] No critical/high security issue remains open.

### Mobile behavior

- [ ] Golden journeys pass on the real-device matrix.
- [ ] Offline, timeout, retry, expired-session, and maintenance states are clear.
- [ ] Deep links and push taps are safe for signed-out/wrong-account cases.
- [ ] Permission denial/revocation has a fallback.
- [ ] Accessibility and large-text checks pass.
- [ ] No secret or sensitive log data exists in the release binary/logs.

### Business and stores

- [ ] Legal entity owns Apple, Google, Expo, domain, Stripe, and service accounts.
- [ ] Privacy, terms, support, and web deletion pages are live.
- [ ] Apple App Privacy and Google Data safety match actual behavior.
- [ ] App icons, screenshots, descriptions, ratings, permissions, and reviewer notes are complete.
- [ ] Reviewer accounts work and will remain available.
- [ ] TestFlight and Play closed/internal release candidates pass.
- [ ] Monitoring, rollback, customer support, and incident owners are ready.
- [ ] Business owner approves submission and release timing.

## 19. Recommended first two milestones

### Milestone A: production-quality foundation

1. Add workspaces and `apps/mobile`.
2. Create `packages/contracts`.
3. Implement `MobileSession`, token signing/rotation, auth endpoints, and unified authorization.
4. Build native session bootstrap, login/OTP, Explore, listing details, and one idempotent favourite action.
5. Produce development builds for one iPhone and one Android device.
6. Complete an API authorization and secret-exposure review.

### Milestone B: bookable renter beta

1. Profile/licence upload.
2. Availability and server quotes.
3. Idempotent booking request.
4. Trips and reservation details.
5. Chat, push notification, and deep-link proof.
6. Signed preview distribution and end-to-end staging tests.

Do not add PaymentSheet, complex owner listing editing, or broad analytics until Milestone A establishes the secure pattern. This ordering makes every later feature faster and safer to implement.

## 20. Official references to recheck at release time

- [Create an Expo project](https://docs.expo.dev/get-started/create-a-project/)
- [EAS Build setup](https://docs.expo.dev/build/setup/)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
- [Submit apps with EAS](https://docs.expo.dev/deploy/submit-to-app-stores/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow)
- [Submit an app to Apple review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
- [Create and set up an app in Play Console](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
- [Google Play testing tracks](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
