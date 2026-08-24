# Redrive Mobile Foundation Register

**Scope:** execution record for Sections 1–4 of `expoGuide.md`

**Recorded:** 24 August 2026

**Next implementation boundary:** Section 5 (workspace and Expo application)

This register separates decisions that can be made from the repository from
credentials and ownership facts that must be confirmed by a Redrive account
owner. A provisional value must not be used to create a store listing until its
owner gate is checked.

## 1. Architecture decision

**Accepted:** keep the existing Next.js application as the web client and sole
backend, then add a native Expo/React Native client under `apps/mobile`.

The native client will call versioned HTTPS endpoints under `/api/mobile/v1`.
It will not connect directly to MongoDB, Prisma, Stripe secret-key operations,
Cloudinary signing, SMTP, or cron jobs. Pricing, availability, authorization,
booking state, payment state, and protected-media decisions remain on the
server.

Code shared with mobile is limited to runtime API contracts, pure domain logic,
design tokens, and product language. Existing DOM components, server actions,
browser session assumptions, CSS, and browser map code are not mobile modules.

## 2. Backend readiness audit

The repository supports the target architecture, but it is not ready for an
authenticated native client yet.

| Area | Evidence in the repository | Status before Section 5 |
|---|---|---|
| Data and business objects | `prisma/schema.prisma` contains users, listings, reservations, quotes, payments, sessions, handovers, incidents, saved searches, reviews, chats, messages, and notifications | Reusable server-side |
| Browser authentication | `pages/api/auth/[...nextauth].ts` and session-based routes | Keep for web |
| Legacy bearer authentication | `app/libs/auth-middleware.ts` verifies a JWT with `NEXTAUTH_SECRET` | Compatibility only; do not use for mobile |
| Legacy login route | `app/api/auth/login/route.ts` is gated by `ENABLE_LEGACY_API_AUTH` | Keep disabled |
| Mobile API | No `app/api/mobile/v1` tree exists | Required in Sections 7–8 |
| Public discovery | Current web flow relies substantially on server actions and web-oriented routes | Add an explicit paginated mobile contract |
| Legal and support pages | `/privacy`, `/terms`, `/account-deletion`, and support content exist through `app/[slug]/page.tsx` | Content exists; owner/legal review remains |
| Account deletion | Profile UI and protected deletion routes exist | Reuse behavior behind a mobile endpoint later |

The mobile API must introduce independent asymmetric signing keys, short-lived
access tokens, opaque rotating refresh tokens, reuse detection, device-session
revocation, and one authorization entry point. `NEXTAUTH_SECRET` must not be
repurposed for that lifecycle.

## 3. Product and store decision register

| Decision | Recorded direction | Gate/status |
|---|---|---|
| Production API origin | One canonical Redrive-owned HTTPS origin | **Owner confirmation required** before OAuth, links, or store records |
| iOS bundle ID | `au.com.redrive.app` | Provisional; confirm domain ownership and availability in Apple Developer |
| Android application ID | `au.com.redrive.app` | Provisional; confirm ownership and availability in Play Console |
| Display name | `Redrive` | Accepted subject to store-name checks |
| Version 1 owner scope | Reservation decisions, availability blocks, chat, handover, and incident flows; defer the complex listing editor unless acquisition requires it | Accepted |
| Initial login | Email/password, email verification, recovery, and existing email OTP behavior | Accepted |
| Social login | Do not expose social login in the first review build | Accepted; implement Google and Apple together on iOS if enabled later |
| Payment UI | Stripe PaymentSheet for rental payment; Stripe-hosted Connect onboarding for owners | Accepted, pending staging verification |
| Minimum OS versions | Use the supported floor of the Expo SDK selected in Section 5, then raise it only with audience/device evidence | Provisional until the SDK is pinned |
| Tablet support | Phone-first first release; do not claim a tablet-optimized layout | Accepted; configure honestly during Section 6 |
| Legal URLs | Existing privacy, terms, account-deletion, and support pages on the canonical production origin | Content present; business-owner and Australian legal review required |

### Account ownership gates

- [ ] An organization-owned Expo account, organization, and project owner are recorded.
- [ ] Apple Developer Program enrolment and App Store Connect roles are active.
- [ ] A Google Play Console organization account and release roles are active.
- [ ] The production domain and DNS owner are recorded.
- [ ] Business owners are recorded for Stripe, Cloudinary, MongoDB Atlas,
      Google Cloud, SMTP, Vercel, and domain/DNS.
- [ ] Recovery codes and credential ownership are stored in an approved password
      or secret manager.
- [ ] The provisional bundle/application ID is confirmed in both store portals.
- [ ] Privacy, terms, deletion, support, insurance, and marketplace wording have
      the required business and legal approval.

Do not commit Apple `.p8`/`.p12` files, Android `.jks`/`.keystore` files,
`credentials.json`, `google-services.json`, `GoogleService-Info.plist`, recovery
codes, or any populated environment file. The repository ignore rules protect
the standard local paths, but the secret manager remains the source of truth.

## 4. Environment preparation

Three independently scoped configurations are required:

| Concern | Development | Preview | Production |
|---|---|---|---|
| Native distribution | Local development build | Internal signed build | Store-signed build |
| Backend | Local/LAN backend or development deployment | Stable HTTPS staging origin | Canonical HTTPS production origin |
| MongoDB | Disposable development database | Separate staging database | Production database |
| Stripe | Test mode | Test mode with staging webhooks | Live mode |
| Cloudinary | Development folder/product environment | Staging folder/product environment | Production folder/product environment |
| Push | Development credentials/project | Preview credentials/project | Production APNs/FCM credentials |
| Email | Safe local capture or development sender | Staging sender and test recipients | Verified production sender |

Preview must never write bookings, messages, uploads, payments, or notifications
to production services. A stable preview origin is required for repeatable deep
links, OAuth callbacks, Stripe returns, and reviewer testing.

The root `.env.example` now documents the server-only mobile token and Expo push
variables, plus the public Expo build-time values. Actual values belong in
ignored local files and in separately scoped Vercel/EAS environment stores.

### Server-only mobile variables

- `MOBILE_TOKEN_ISSUER`
- `MOBILE_TOKEN_AUDIENCE`
- `MOBILE_ACCESS_TOKEN_KEY_ID`
- `MOBILE_ACCESS_TOKEN_PRIVATE_KEY`
- `MOBILE_ACCESS_TOKEN_PUBLIC_KEYS`
- `MOBILE_REFRESH_TOKEN_PEPPER`
- `MOBILE_ALLOW_AUTH_PREVIEWS`
- `EXPO_ACCESS_TOKEN`

Signing keys must use key IDs and allow an old public key to remain available
for verification during rotation. The refresh-token pepper is independent of
all signing, session, rate-limit, Stripe, and cron secrets.

### Public mobile build variables

- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_API_ORIGIN`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY`

Every `EXPO_PUBLIC_` value is extractable from the installed application.
Provider restrictions and backend authorization must therefore provide the
security boundary.

### Exit gate for Sections 1–4

- [x] Target client/server boundary recorded.
- [x] Current authentication and API gaps verified against the repository.
- [x] Safe first-release product defaults recorded.
- [x] Server and public mobile variable names added to `.env.example`.
- [x] Standard native credential files added to `.gitignore`.
- [ ] Canonical production and stable preview origins confirmed by the owner.
- [ ] Store identifier availability confirmed by the owner.
- [ ] Organization accounts and named owners confirmed.
- [ ] Separate Preview and Production data/provider resources provisioned.
- [ ] Real values added to Vercel/EAS scopes without entering Git.

Section 5 can begin without store credentials, but no preview or production
distribution should be represented as environment-safe until the unchecked
owner and provisioning gates above are complete.
