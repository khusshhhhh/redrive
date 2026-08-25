# Redrive security and feature implementation report

Date: 17 August 2026  
Scope: Security and Trust 1.1–1.8, all P0 items, and reusable P1/P2 backend foundations.

## Outcome

This implementation closes a critical cross-account reservation-read vulnerability and moves booking calculations, availability and state transitions to the server. It also adds durable rate limiting, account recovery, audit records, private licence delivery, licence lifecycle automation, browser security headers, backup/restore tooling, digital handover and incident APIs.

The repository passes `npm run build`. External marketplace payments, a production backup destination, passkey ceremonies and a complete WCAG 2.2 audit are not represented as finished: each needs credentials, domain/provider configuration, business rules or manual verification that cannot safely be invented in source code.

## Critical issue corrected

Previously, `GET /api/reservations` authenticated the caller but returned every reservation with complete user and listing objects. It now returns at most 100 newest records where the caller is the guest or owns the listing, uses a limited user projection, and marks the response private/no-store.

## Implemented controls

### Authentication and recovery

- Shared MongoDB fixed-window rate limits with separate account and IP scopes.
- HMAC-hashed identifiers so raw email/IP values are not stored in rate-limit or audit records.
- Limits on signup availability checks, account creation, credential login, email verification/resend, password recovery and booking creation.
- Generic password-recovery response to reduce account enumeration.
- Cryptographically random, hashed, single-use reset tokens with a 30-minute lifetime.
- Password reset pages and API; password rotation revokes registered device sessions.
- The compatibility bearer-token login is disabled unless `ENABLE_LEGACY_API_AUTH=true`; when enabled, tokens last 15 minutes and enforce issuer/audience claims.
- Failed and successful credential logins and sensitive account actions write audit events.

### Booking and privacy integrity

- Booking price is recalculated from the database listing rate and date range; client totals and client insurance fees are ignored.
- Insurance options are allow-listed, fees are calculated per day, and pricing is stored as a versioned immutable JSON snapshot plus a quote record.
- Date validation, minimum/maximum trip length, minimum notice, reservation overlap and owner-block overlap checks.
- Cancellation updates the record instead of deleting evidence, records actor/reason/time and calculates a refund estimate.
- Host status changes follow an allow-listed state machine.
- Exact address and coordinates are hidden from a guest until the reservation is approved; the owner keeps access.
- Participant-only handover and incident APIs provide a foundation for pickup, return and dispute workflows.

Important concurrency note: overlap checking materially reduces double booking, but strict booking uniqueness under simultaneous requests should use a database transaction/locking strategy supported by the production MongoDB topology. Payment capture must also recheck availability immediately before commitment.

### Licence lifecycle

- New licence images use Cloudinary authenticated delivery instead of public upload delivery.
- The stored application URL resolves to a five-minute signed Cloudinary URL only for the owning user or an administrator.
- Licence state supports not submitted, pending, verified, rejected and expired, with reviewer, reason and expiry metadata.
- Protected admin review endpoint and a daily expiry task.
- Booking remains denied for absent, rejected or expired licence submissions. Product policy must decide whether `PENDING` may request a booking or only `VERIFIED`; current behaviour permits a submitted pending document, matching the existing app wording.

### Browser and operations security

- HSTS, CSP, frame denial, MIME sniff prevention, referrer, permissions and cross-origin opener headers.
- CSP currently retains `unsafe-inline`/`unsafe-eval` for compatibility with the current Next.js/Google Maps client. Migrate to nonces and validate in report-only mode before tightening production.
- Compressed MongoDB backup script with SHA-256 checksum.
- Restore drill refuses a target URL unless it clearly names a restore/drill/staging/test database.
- Daily cleanup removes expired rate buckets, stale reset tokens and old session records and marks expired licences.

## Backend performance work

- Compound indexes added for booking overlap queries, user trips, owner listings, discovery filters, audit lookup, rate-limit expiry, handovers, incidents, maintenance and saved searches.
- Reservation list uses an ownership filter, newest-first limit and narrow user selection instead of unbounded full-record loading.
- Reservation and availability conflict queries run in parallel.
- Expired high-churn security records are removed daily.
- Notification sending is detached from the booking response after the reservation is committed.

These indexes become active only after the Prisma schema is applied to the target database.

## Deployment checklist

1. Back up the target database and confirm which environment `DATABASE_URL` points to.
2. Apply the schema intentionally with `npx prisma db push` against staging first. This was not run automatically because the local environment may point to shared or production data.
3. Add a strong `RATE_LIMIT_SECRET`; retain `ENABLE_LEGACY_API_AUTH=false` unless a documented integration needs it.
4. Confirm `CRON_SECRET`, SMTP and Cloudinary secrets in Vercel.
5. Re-upload older public licence images so they move to authenticated delivery; existing public Cloudinary URLs cannot be made private by application code alone.
6. Run `scripts/backup-mongodb.ps1`, copy the archive to encrypted off-site storage, then run `scripts/restore-drill-mongodb.ps1` only with a disposable `RESTORE_TEST_DATABASE_URL`.
7. Smoke-test signup, verification, password reset, licence upload/review, quote, booking conflict, approval, cancellation, handover and incident access using separate guest/host/admin accounts.
8. Run an accessibility audit and CSP report-only trial before tightening policy.

## Work that requires product/provider decisions

- Marketplace payments/payouts: select Stripe Connect account model, decide who is merchant of record, define AU tax/GST handling, identity requirements, deposit/authorisation timing, chargebacks, cancellation/refund policy and payout delay. Then implement idempotent webhook-led state transitions; never mark a booking paid from the browser callback.
- Passkeys: configure relying-party ID/origins and install a maintained WebAuthn implementation before exposing registration/authentication UI.
- Session devices: decide JWT migration strategy or move sensitive sessions to database-backed sessions so revocation is immediate.
- Backups: select encrypted destination, retention, alerting and an accountable operator.
- Accessibility: a complete WCAG 2.2 claim requires manual assistive-technology and keyboard validation, not only code review.
- P1/P2 product surfaces: comparison, recommendations, synced alerts, fleet, pricing suggestions, route/range data and PWA offline behaviour need UX work and/or provider data beyond the backend models added here.

## Validation

- `npx prisma format` — passed.
- `npx prisma generate` — passed.
- `npm run build` — passed; 53 App Router routes plus the NextAuth route compiled and prerendered successfully.
- Build warnings retained: the repository has parent/child lockfiles and local Browserslist data is old. Neither warning failed the build.

## Security references

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Credential Stuffing Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Stripe Connect documentation](https://docs.stripe.com/connect)
