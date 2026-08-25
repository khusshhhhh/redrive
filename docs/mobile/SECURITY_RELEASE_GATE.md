# Mobile Security and Privacy Release Gate

No external Preview tester or store reviewer should receive a build until every
applicable item has dated evidence, an owner, and a link to the evidence.

## Binary and configuration

- [ ] Run `npm run verify:mobile-release -- --production` with the exact EAS
  Production environment values.
- [ ] Review the recorded Expo `xcode -> uuid` moderate advisory against the
  current SDK release; do not accept npm's forced Expo 46 downgrade as a fix.
- [ ] Export the final JavaScript bundle and inspect it for credentials, private
  URLs, private keys, provider secrets, licence data, addresses, and test users.
- [ ] Inspect the EAS build artifact's resolved app config, Android manifest,
  iOS entitlements, permissions, URL schemes, associated domains, and network
  security settings.
- [ ] Confirm production permits only TLS API traffic and has no broad clear-text
  or App Transport Security exception.
- [ ] Confirm the bundle ID, package, build numbers, runtime version, update
  channel, API origin, and link host match Production—not Preview.

## Authentication and authorization

- [ ] Access-token signature, key ID, issuer, audience, expiry, subject, session,
  revocation, and password-change tests pass.
- [ ] Refresh rotation and concurrent refresh are tested; old-token reuse revokes
  the full token family and creates a security audit event.
- [ ] Logout disables the device's push registration; logout-all, password
  change, and account deletion revoke all applicable sessions/tokens.
- [ ] Every object route has no-credential, invalid/revoked credential,
  wrong-owner/participant, and authorized-user tests.
- [ ] A valid account cannot access another user's trip, exact address, chat,
  protected file, licence, payment object, push token, or deletion state.

## Data minimization and redaction

- [ ] Public listing DTOs contain suburb/state only—no exact address,
  coordinates, registration, owner record, provider identifier, or private media.
- [ ] Logs, analytics, traces, and crash reports exclude access/refresh tokens,
  OTPs, reset links, licence data, exact addresses, chat bodies, Stripe IDs,
  image provider public IDs, and request bodies.
- [ ] Push payloads contain only an allowlisted type and opaque resource ID.
- [ ] Cached mobile data inventory states what is in memory, SecureStore, normal
  app storage, OS notification history, and provider SDK storage.
- [ ] Licence/handover media uses short-lived authorization and is excluded from
  general-purpose disk/image caches.

## Provider and lifecycle controls

- [ ] `docs/mobile/DATA_RETENTION_MATRIX.md` has business/legal-approved periods,
  deletion behavior, backup expiry, and provider owner for every data class.
- [ ] Account deletion is tested with no blockers and with each blocker type.
- [ ] MongoDB backup and `scripts/restore-drill-mongodb.ps1` succeed against a
  disposable restore/staging database before schema deployment.
- [ ] Cloudinary, Stripe, SMTP/email, Expo push, monitoring, and backup deletion
  or lawful-retention behavior is tested and documented.
- [ ] Privacy, terms, support, and account-deletion URLs return stable HTTPS 200.

## Device, link, and incident readiness

- [ ] Universal/App Links return JSON without redirects and open release-signed
  apps for installed/signed-in, installed/signed-out, wrong-account,
  expired/deleted-resource, and app-not-installed cases.
- [ ] Notification permission denied/revoked and invalid token receipt behavior
  is usable and does not leak content.
- [ ] Signing-key rotation runbook has been rehearsed without using Production
  private keys in logs, tickets, chat, or repository files.
- [ ] Lost-device/logout-all response has been rehearsed.
- [ ] Primary and secondary production incident owners, paging path, provider
  contacts, evidence location, and customer/support communicator are assigned.
- [ ] Crash, auth anomaly, API health, payment webhook, push failure, and backup
  alerts are configured and tested.

## Required approvals

- [ ] Engineering owner signs the evidence record.
- [ ] Product/business owner approves external testing scope and rollback plan.
- [ ] Qualified Australian legal/privacy advice covers identity documents,
  rental/consumer obligations, payment and tax records, retention, insurance,
  cross-border processing, privacy disclosures, and deletion wording.
