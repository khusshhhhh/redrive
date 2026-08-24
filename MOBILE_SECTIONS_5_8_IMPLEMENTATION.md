# Redrive Sections 5–8 Implementation Record

**Implemented:** 24 August 2026  
**Branch:** `feature/mobile-foundation`  
**Scope:** repository work in Sections 5–8 of `expoGuide.md`

## Completed repository work

- Added npm workspaces for `apps/*` and `packages/*` while leaving the Next.js
  application and Prisma paths in place.
- Generated and pinned an Expo SDK 57 application at `apps/mobile`, with
  development, preview, and production application variants.
- Added a dynamic `app.config.ts`, an `eas.json`, permission copy, phone-only
  iOS support, variant bundle/application IDs, optional verified links, and no
  committed credentials.
- Added `@redrive/contracts` with Zod request schemas, stable mobile errors,
  safe listing DTOs, cursor pagination, ISO dates, and integer-cent prices.
- Added `/api/mobile/v1` authentication, account, discovery, favourites,
  saved-search, quote/reservation, owner-status/availability, chat,
  notification, and per-device push-token controllers.
- Added asymmetric RS256 access tokens with `kid`, issuer and audience checks;
  opaque pepper-hashed rotating refresh tokens; token-family reuse detection;
  device logout/logout-all; and password-change/deletion revocation.
- Unified web-session and mobile-bearer identity resolution without enabling
  the legacy `NEXTAUTH_SECRET` bearer flow.
- Added persistent, actor-scoped idempotency records with normalized request
  hashes, bounded retention, response replay, and request-ID correlation.
- Added the Expo session bootstrap, SecureStore refresh-token storage,
  memory-only access tokens, single-flight refresh, one authenticated retry,
  bounded safe-GET retries, timeouts, stable errors, cache clearing, protected
  navigation, and encrypted offline logout revocation retry.
- Added public/authenticated routing, five protected tabs, public listings,
  registration, email verification, login/OTP, recovery, favourites, trips,
  inbox, profile, reservation detail, and chat foundations.

Payments, upload UX, handover/incident UX, native maps, push-permission UX, and
store-quality branded assets remain Section 9 vertical slices. Their secrets
and native SDKs are deliberately not enabled speculatively in Sections 5–8.

## Verification completed

| Check | Result |
|---|---|
| Expo Doctor | 21/21 checks passed |
| Mobile TypeScript | Passed |
| Shared-contract TypeScript | Passed |
| Next.js/server TypeScript | Passed |
| Mobile ESLint | Passed with no warnings |
| Automated tests | 24/24 passed |
| Prisma format/validate/generate | Passed |
| Expo public config evaluation | Passed |
| Expo Router/Metro web export smoke test | Passed (40 static routes) |

The repository-wide Next.js lint command still reports pre-existing web lint
errors outside the mobile implementation. The mobile files introduced here do
not add a lint error. See the command output before treating global lint as an
exit gate.

## Owner-controlled activation steps

These steps require account ownership or mutate external state and were not
performed automatically:

1. Confirm the production and stable preview HTTPS origins and the availability
   of `au.com.redrive.app` in both store portals.
2. Provision separate Preview and Production MongoDB, Stripe, Cloudinary,
   email, push, and other provider resources.
3. Generate independent RS256 signing keys and refresh-token peppers for each
   backend environment. Put only the private key and pepper in secret storage;
   configure the public-key JSON map by key ID for safe rotation.
4. Add server values to the matching Vercel scopes and public app values to the
   matching EAS `development`, `preview`, and `production` environments.
5. Back up and confirm the Preview database target, then run `npx prisma db push`
   there before any mobile API request. Repeat for Production only through the
   approved production deployment process.
6. From `apps/mobile`, run `npx eas-cli@latest login`, `init`, and
   `build:configure` using the organization-owned Expo account. Record the real
   project ID as `EXPO_PUBLIC_EAS_PROJECT_ID`; do not paste credentials into Git.
7. Publish Apple and Android association files for every signed app identity
   that must verify links, then test them on physical iOS and Android devices.

Until these steps are complete, local compilation is valid but a signed preview
or production build must not be represented as connected to an isolated,
production-safe environment.
