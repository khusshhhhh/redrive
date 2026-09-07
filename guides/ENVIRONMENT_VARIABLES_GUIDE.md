# Redrive Environment Variables, Vercel, and Expo/EAS Setup

This guide explains every value in `.env.example`, where to obtain it, how to
configure the Next.js and Expo applications locally, and how to scope values in
Vercel and Expo Application Services (EAS).

> Never paste real secrets into `.env.example`, this document, source code, Git commits, screenshots, or support messages. Put local secrets in `.env.local` or `.env`. Both are ignored by Git in this project.

Two checks keep this in sync (CI runs the first):

- `npm run check:env` — fails if the code reads a `process.env` variable that
  `.env.example` doesn't document. If you add a new variable, add it to
  `.env.example` **and** this guide.
- `npm run check:db-indexes` — verifies a live database has the
  correctness-critical unique indexes (run after `prisma db push`).

## 1. What the completed local file looks like

Create `.env.local` in the project root. You may use `.env` instead, but `.env.local` is the conventional choice for machine-specific Next.js secrets.

```dotenv
DATABASE_URL="mongodb+srv://redrive_app:URL_ENCODED_PASSWORD@cluster0.example.mongodb.net/redrive?retryWrites=true&w=majority"
# DATABASE_POOL_SIZE="5"          # optional; Prisma maxPoolSize, default 5

NEXTAUTH_SECRET="a-long-random-secret-generated-for-this-project"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
RATE_LIMIT_SECRET="an-independent-hmac-secret"
SESSION_IDLE_TIMEOUT_MINUTES="60"
ENABLE_LEGACY_API_AUTH="false"
ADMIN_EMAILS="you@example.com"
GOOGLE_CLIENT_ID="123456789-example.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-example"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-sender@gmail.com"
SMTP_PASS="your-16-character-google-app-password"
EMAIL_FROM="Redrive <your-sender@gmail.com>"
PRIVACY_CONTACT_EMAIL="privacy@redrive.com.au"
SUPPORT_CONTACT_EMAIL="support@redrive.com.au"

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIza-example-browser-key"
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=""
GOOGLE_PLACES_API_KEY="AIza-example-server-key"

GOOGLE_CLOUD_VISION_API_KEY="AIza-example-vision-key"
LICENSE_DATA_ENCRYPTION_KEY="base64-encoded-32-byte-key"
LICENSE_DATA_HMAC_KEY="an-independent-random-secret"

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

STRIPE_SECRET_KEY="sk_test_example"
STRIPE_WEBHOOK_SECRET="whsec_example"
# DEPOSIT_PREAUTH_ENABLED="false"   # feature flag: security-deposit pre-auth

CRON_SECRET="another-long-random-secret"

# ── Error tracking (Sentry) — Section 13 ────────────────────────────────────
# Blank locally (the SDK is a no-op); required-ish in production.
# SENTRY_DSN="https://examplekey@o000000.ingest.sentry.io/0000000"
# NEXT_PUBLIC_SENTRY_DSN="https://examplekey@o000000.ingest.sentry.io/0000000"
# SENTRY_TRACES_SAMPLE_RATE="0.1"
# NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE="0.05"
# The next three are only needed in the environment that builds & uploads source maps:
# SENTRY_ORG="your-org-slug"
# SENTRY_PROJECT="redrive"
# SENTRY_AUTH_TOKEN="sntrys_example"

# ── Realtime updates (Pusher) — Section 14, optional ───────────────────────
# NEXT_PUBLIC_REALTIME_ENABLED="1"
# NEXT_PUBLIC_PUSHER_KEY="pusher-app-key"
# NEXT_PUBLIC_PUSHER_CLUSTER="ap4"
# PUSHER_APP_ID="0000000"
# PUSHER_KEY="pusher-app-key"
# PUSHER_SECRET="pusher-app-secret"
# PUSHER_CLUSTER="ap4"

# ── Rate-limit store (Upstash Redis) — Section 15, recommended for scale ───
# UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="upstash-rest-token"

# ── SMS notifications (Twilio) — Section 16, optional ──────────────────────
# SMS_PROVIDER="twilio"
# SMS_FROM="+15551234567"
# SMS_TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
# SMS_TWILIO_AUTH_TOKEN="twilio-auth-token"
# PUSH_DISABLED="false"

API_MONITOR_SUCCESS_SAMPLE_RATE="0.25"
API_MONITOR_CLIENT_ERROR_SAMPLE_RATE="0.5"

MOBILE_TOKEN_ISSUER="http://localhost:3000"
MOBILE_TOKEN_AUDIENCE="redrive-mobile-api"
MOBILE_ACCESS_TOKEN_KEY_ID="development-2026-08"
MOBILE_ACCESS_TOKEN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----"
MOBILE_ACCESS_TOKEN_PUBLIC_KEYS='{"development-2026-08":"-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"}'
MOBILE_REFRESH_TOKEN_PEPPER="an-independent-random-base64-value"
MOBILE_ALLOW_AUTH_PREVIEWS="false"
EXPO_ACCESS_TOKEN=""
```

The strings above are examples only. Do not copy them as working credentials.
The mobile application has its own local file at `apps/mobile/.env.local`:

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_ORIGIN=http://localhost:3000
EXPO_PUBLIC_LINK_HOST=
EXPO_PUBLIC_EAS_PROJECT_ID=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=
```

Never put `MOBILE_ACCESS_TOKEN_PRIVATE_KEY`, `MOBILE_REFRESH_TOKEN_PEPPER`,
`EXPO_ACCESS_TOKEN`, a Stripe secret key, or any other server credential in
`apps/mobile/.env.local` or in an `EXPO_PUBLIC_` variable.

## 2. Quick reference

| Variable | Required? | Secret? | Used where |
|---|---:|---:|---|
| `DATABASE_URL` | Yes | Yes | Prisma/MongoDB server connection |
| `DATABASE_POOL_SIZE` | No | No | Prisma `maxPoolSize`; default `5` (suits serverless) |
| `NEXTAUTH_SECRET` | Yes | Yes | NextAuth web sessions and disabled legacy API compatibility |
| `NEXTAUTH_URL` | Yes in production | No | Authentication callback base URL |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | No | Canonical public web origin |
| `RATE_LIMIT_SECRET` | Yes | Yes | HMAC key for privacy-safe rate-limit identifiers |
| `SESSION_IDLE_TIMEOUT_MINUTES` | Recommended | No | Revokes web and native sessions after inactivity; defaults to 60 minutes |
| `ENABLE_LEGACY_API_AUTH` | No (keep `false`) | No | Temporary switch for the deprecated `/api/auth/login` compatibility endpoint |
| `ADMIN_EMAILS` | Recommended | Sensitive | Comma-separated allow-list for `/admin` in addition to the `ADMIN` role |
| `MOBILE_TOKEN_ISSUER` | Before mobile API rollout | No | Expected mobile access-token issuer |
| `MOBILE_TOKEN_AUDIENCE` | Before mobile API rollout | No | Expected mobile API audience |
| `MOBILE_ACCESS_TOKEN_KEY_ID` | Before mobile API rollout | No | Active signing-key identifier written into access-token headers |
| `MOBILE_ACCESS_TOKEN_PRIVATE_KEY` | Before mobile API rollout | Yes | Signs short-lived mobile access tokens |
| `MOBILE_ACCESS_TOKEN_PUBLIC_KEYS` | Before mobile API rollout | No | Key-ID map used to verify access tokens during rotation |
| `MOBILE_REFRESH_TOKEN_PEPPER` | Before mobile API rollout | Yes | Independent keyed hash input for opaque refresh tokens |
| `MOBILE_ALLOW_AUTH_PREVIEWS` | Local/test only | No | Explicitly permits local verification-code previews; ignored in production |
| `EXPO_ACCESS_TOKEN` | When authenticated Expo push is enabled | Yes | Server-to-Expo push authentication |
| `MOBILE_APPLE_TEAM_ID` | Signed mobile builds | No | 10-character Apple Team ID used in the iOS app-site-association file |
| `MOBILE_IOS_BUNDLE_ID` | Signed mobile builds | No | Approved iOS bundle identifier (`au.com.redrive.app[.suffix]`) |
| `MOBILE_ANDROID_PACKAGE` | Signed mobile builds | No | Approved Android application ID (`au.com.redrive.app[.suffix]`) |
| `MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS` | Signed mobile builds | No | Comma-separated signing-certificate SHA-256 fingerprints for Android App Links |
| `GOOGLE_CLIENT_ID` | For Google sign-in | Usually no | Google OAuth identification |
| `GOOGLE_CLIENT_SECRET` | For Google sign-in | Yes | Google OAuth server exchange |
| `SMTP_HOST` | For production email verification | No | SMTP server hostname |
| `SMTP_PORT` | For production email verification | No | SMTP server port |
| `SMTP_SECURE` | For production email verification | No | Direct TLS configuration |
| `SMTP_USER` | For production email verification | Sensitive | SMTP account name/email |
| `SMTP_PASS` | For production email verification | Yes | SMTP app password |
| `EMAIL_FROM` | For production email verification | No | Sender shown to recipients |
| `PRIVACY_CONTACT_EMAIL` | Recommended | No | Address shown on the privacy policy page; defaults to `privacy@redrive.com.au` |
| `SUPPORT_CONTACT_EMAIL` | Recommended | No | Address shown on legal/support pages; defaults to `support@redrive.com.au` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | For maps | Public by design | Browser-side Google Maps SDK |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | No | No | Optional Google map style ID |
| `GOOGLE_PLACES_API_KEY` | For address search | Yes | Server-side Places requests |
| `GOOGLE_CLOUD_VISION_API_KEY` | For licence checks | Yes | Server-side driver-licence OCR (Cloud Vision) |
| `LICENSE_DATA_ENCRYPTION_KEY` | For licence checks | Yes | AES-256-GCM key (base64, 32 bytes) for stored licence/card numbers |
| `LICENSE_DATA_HMAC_KEY` | For licence checks | Yes | Independent key for non-reversible duplicate-check hashes |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | For images | Public by design | Cloudinary account identifier |
| `CLOUDINARY_API_KEY` | For server upload route | Sensitive | Cloudinary API identification |
| `CLOUDINARY_API_SECRET` | For server upload route | Yes | Cloudinary signed operations |
| `STRIPE_SECRET_KEY` | For bookings/payments | Yes | Server-side Stripe API calls (Checkout, Connect) |
| `STRIPE_WEBHOOK_SECRET` | For bookings/payments | Yes | Verifies Stripe webhook signatures at `/api/stripe/webhook` |
| `DEPOSIT_PREAUTH_ENABLED` | No (keep `false`) | No | Feature flag — turns on security-deposit pre-authorisation (`app/libs/deposit.ts`) |
| `CRON_SECRET` | For scheduled notifications | Yes | Protects the cron endpoints |
| `SENTRY_DSN` | Strongly recommended in prod | Yes | Server + edge error tracking; `validateServerEnv()` warns if missing in prod |
| `NEXT_PUBLIC_SENTRY_DSN` | Strongly recommended in prod | Public by design | Browser error tracking |
| `SENTRY_TRACES_SAMPLE_RATE` | No | No | Server trace sampling; default `0.1` |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | No | Public by design | Browser trace sampling; default `0.05` |
| `SENTRY_ORG` | Source-map upload only | No | Sentry org slug, read by `next.config.js` at build |
| `SENTRY_PROJECT` | Source-map upload only | No | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Source-map upload only | Yes | Uploads source maps during the deploy build; blank = upload skipped |
| `SMS_PROVIDER` | For the SMS channel | No | `twilio` to enable SMS notifications; unset = SMS logged and skipped |
| `SMS_FROM` | With SMS enabled | No | Sending number / alphanumeric sender ID |
| `SMS_TWILIO_ACCOUNT_SID` | With SMS enabled | Sensitive | Twilio Account SID (`AC…`) |
| `SMS_TWILIO_AUTH_TOKEN` | With SMS enabled | Yes | Twilio auth token |
| `PUSH_DISABLED` | No | No | `true` hard-disables Expo push delivery regardless of tokens |
| `RESTORE_DRILL_SOURCE_URI` | Restore drills only | Yes | Read-only `mongodb+srv://` for `scripts/restore-drill.mjs` |
| `RESTORE_DRILL_TARGET_URI` | Restore drills only | Yes | Disposable scratch cluster the drill restores into |
| `RESTORE_DRILL_SOURCE_DB` | No | No | Source DB name override; default parsed from the URI |
| `RESTORE_DRILL_MIN_COLLECTIONS` | No | No | Drill fails if fewer collections restore; default `10` |
| `API_MONITOR_SUCCESS_SAMPLE_RATE` | No | No | Fraction of successful production requests sampled; default `0.25` |
| `API_MONITOR_CLIENT_ERROR_SAMPLE_RATE` | No | No | Fraction of handled 4xx responses sampled; default `0.5` |
| `NEXT_PUBLIC_REALTIME_ENABLED` | For push chat/notifications | Public by design | `1` to use Pusher for live updates; unset falls back to SSE polling. See `guides/realtime.md` |
| `NEXT_PUBLIC_PUSHER_KEY` | With realtime enabled | Public by design | Pusher app key (client subscribes with it) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | With realtime enabled | Public by design | Pusher cluster, e.g. `ap4` (Sydney) |
| `PUSHER_APP_ID` | With realtime enabled | Sensitive | Pusher app id (server publish + auth) |
| `PUSHER_KEY` | With realtime enabled | Sensitive | Pusher app key (server side) |
| `PUSHER_SECRET` | With realtime enabled | Yes | Pusher app secret — signs private-channel auth and REST publishes |
| `PUSHER_CLUSTER` | With realtime enabled | No | Pusher cluster (server side; same value as the public one) |
| `UPSTASH_REDIS_REST_URL` | Recommended for scale | No | Upstash Redis REST endpoint. When set, rate limiting uses Redis instead of MongoDB (`app/libs/rateLimitStore.ts`) |
| `UPSTASH_REDIS_REST_TOKEN` | With Upstash enabled | Yes | Upstash Redis REST token |
| `LOG_LEVEL` | No | No | `debug`\|`info`\|`warn`\|`error`; default `info` in production, `debug` otherwise |
| `EXPO_PUBLIC_APP_ENV` | Mobile builds | Public by design | Runtime environment label |
| `EXPO_PUBLIC_API_ORIGIN` | Mobile builds | Public by design | Versioned mobile API origin |
| `EXPO_PUBLIC_LINK_HOST` | Signed mobile builds | Public by design | Verified host used for universal/app links |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Signed mobile builds | Public by design | Binds the app config to its owner-approved EAS project |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Mobile payments | Public by design | Identifies the Stripe account to the native SDK |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional mobile monitoring | Public by design | Native error-reporting destination |
| `EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY` | Mobile iOS maps | Public by design | Restricted iOS Maps SDK key |
| `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` | Mobile Android maps | Public by design | Restricted Android Maps SDK key |

Anything beginning with `NEXT_PUBLIC_` is included in browser JavaScript. It must not contain a private secret. Browser API keys still need provider-side restrictions.

### Mobile API and Expo environment groups

The mobile names in `.env.example` define the security boundaries used by
`/api/mobile/v1`. They are not permission to enable `/api/auth/login` or reuse
`NEXTAUTH_SECRET` for the native client.

- Keep `MOBILE_ACCESS_TOKEN_PRIVATE_KEY`, `MOBILE_REFRESH_TOKEN_PEPPER`, and
  `EXPO_ACCESS_TOKEN` server-only. Use independent values in Preview and
  Production.
- Store `MOBILE_ACCESS_TOKEN_PUBLIC_KEYS` as a key-ID-to-public-key map. Retain
  the previous verification key until every token it signed has expired.
- Set `MOBILE_TOKEN_ISSUER`, `NEXT_PUBLIC_SITE_URL`, and the mobile API origin to
  deliberately selected origins. Preview uses a stable HTTPS staging origin;
  Production uses the canonical HTTPS Redrive origin.
- Treat every `EXPO_PUBLIC_` value as readable from the installed application.
  Restrict map keys by bundle/application ID and API, use only Stripe
  publishable keys, and enforce authorization on the backend.

Configure public mobile values in EAS's separate `development`, `preview`, and
`production` environments after `apps/mobile` is created. Configure server
values in the corresponding Vercel scope. Preview must use a separate database,
Stripe test mode, and isolated upload/push resources so it cannot mutate
production data.

The decision and account-owner gates for this setup are tracked in
[`MOBILE_FOUNDATION_CHECKLIST.md`](MOBILE_FOUNDATION_CHECKLIST.md). The non-secret
store identifiers (`MOBILE_APPLE_TEAM_ID`, `MOBILE_IOS_BUNDLE_ID`,
`MOBILE_ANDROID_PACKAGE`, `MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS`) are covered
in Section 11.

#### Where each mobile value belongs

| Destination | Values |
|---|---|
| Root `.env.local` | All `MOBILE_*` values and optional `EXPO_ACCESS_TOKEN` |
| `apps/mobile/.env.local` | Only `EXPO_PUBLIC_*` values used by the native app |
| Vercel Development/Preview/Production | Server-side `MOBILE_*` values and `EXPO_ACCESS_TOKEN`, independently scoped |
| EAS development/preview/production | The matching `EXPO_PUBLIC_*` values only |

Expo substitutes `EXPO_PUBLIC_*` values into the application bundle. They are
therefore public even if an EAS dashboard labels them sensitive. Keep private
keys, peppers, provider secrets, and the Expo push access token on the Next.js
server. See Expo's [environment-variable guide](https://docs.expo.dev/guides/environment-variables/)
and [EAS environment guidance](https://docs.expo.dev/eas/environment-variables/).

#### Server-side mobile authentication variables

##### `MOBILE_TOKEN_ISSUER`

The exact origin asserted in access tokens. Use no path, query string, or
fragment. The implementation removes a trailing slash when loading it.

```dotenv
# Local server
MOBILE_TOKEN_ISSUER="http://localhost:3000"

# Stable Preview deployment
MOBILE_TOKEN_ISSUER="https://preview-api.example.com"

# Production
MOBILE_TOKEN_ISSUER="https://example.com"
```

Preview and Production must use stable HTTPS origins. Changing the issuer
invalidates otherwise valid access tokens issued with the previous value.

##### `MOBILE_TOKEN_AUDIENCE`

Identifies the intended API. Keep the current value unless a deliberate token
contract migration is being performed:

```dotenv
MOBILE_TOKEN_AUDIENCE="redrive-mobile-api"
```

##### `MOBILE_ACCESS_TOKEN_KEY_ID`

The identifier written into the JWT `kid` header. It must exactly match a key
in `MOBILE_ACCESS_TOKEN_PUBLIC_KEYS`. Give every environment and rotation a
distinct identifier:

```dotenv
MOBILE_ACCESS_TOKEN_KEY_ID="preview-2026-08"
```

##### `MOBILE_ACCESS_TOKEN_PRIVATE_KEY` and `MOBILE_ACCESS_TOKEN_PUBLIC_KEYS`

Redrive signs mobile access tokens with an RSA PKCS#8 private key and verifies
them using an SPKI public key selected by `kid`. Generate a different key pair
for Development, Preview, and Production. Run these commands in a protected
working directory; `*.pem` is ignored by this repository, but the approved
secret manager should be the long-term source of truth:

```powershell
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out mobile-access-private.pem
openssl pkey -in mobile-access-private.pem -pubout -out mobile-access-public.pem
```

PowerShell can produce the correctly escaped public-key JSON for a chosen key
ID without printing the private key:

```powershell
$mobileKeyId = "development-2026-08"
$mobilePublicPem = Get-Content -Raw -LiteralPath .\mobile-access-public.pem
@{ $mobileKeyId = $mobilePublicPem } | ConvertTo-Json -Compress
```

Put the complete private PEM, including its BEGIN/END lines, into
`MOBILE_ACCESS_TOKEN_PRIVATE_KEY`. Store public keys as one valid JSON object;
newlines inside JSON strings must be represented as `\n`:

```dotenv
MOBILE_ACCESS_TOKEN_PUBLIC_KEYS='{"preview-2026-08":"-----BEGIN PUBLIC KEY-----\nPUBLIC_KEY_CONTENT\n-----END PUBLIC KEY-----"}'
```

For rotation:

1. Add the new public key to the JSON map while retaining the old public key.
2. Deploy the expanded map.
3. Change the private key and `MOBILE_ACCESS_TOKEN_KEY_ID` to the new pair.
4. Retain the old public key for longer than the 10-minute access-token lifetime.
5. Remove the old public key in a later deployment.

Never place the private key in `MOBILE_ACCESS_TOKEN_PUBLIC_KEYS`, EAS, or any
`EXPO_PUBLIC_` variable.

##### `MOBILE_REFRESH_TOKEN_PEPPER`

An independent server secret used to derive stored refresh-token hashes. Use
at least 32 random bytes. Generate it without reusing any NextAuth, database,
rate-limit, signing, Stripe, or cron secret:

```powershell
$mobilePepperBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($mobilePepperBytes)
[Convert]::ToBase64String($mobilePepperBytes)
```

Changing the pepper makes every existing mobile refresh token unusable and
signs all mobile users out after their in-memory access token expires.

##### `MOBILE_ALLOW_AUTH_PREVIEWS`

Leave this `false` normally. Setting it to `true` allows local/test responses
to include verification or login-OTP preview codes when email delivery uses its
development fallback. The server ignores this switch when `NODE_ENV=production`.

```dotenv
MOBILE_ALLOW_AUTH_PREVIEWS=false
```

Do not enable it in Vercel Preview or Production merely to work around missing
SMTP configuration; configure the appropriate email sender instead.

##### `EXPO_ACCESS_TOKEN`

Optional server credential for Expo Push Service enhanced security. Enable
enhanced push security in the EAS project first, create a personal or preferably
[limited robot-user access token](https://docs.expo.dev/accounts/programmatic-access/)
authorized for the owning Expo organization,
and store it only in Vercel. It is sent by the backend—not by the installed app. Expo
documents this in [Push Service additional security](https://docs.expo.dev/push-notifications/sending-notifications/#additional-security).

Leave it blank until authenticated push delivery is enabled:

```dotenv
EXPO_ACCESS_TOKEN=
```

#### Expo application variables

##### `EXPO_PUBLIC_APP_ENV`

Selects the application identity in `apps/mobile/app.config.ts`. Only these
values are accepted:

| Value | Display name | Identifier suffix | Scheme |
|---|---|---|---|
| `development` | Redrive Development | `.development` | `redrive-development` |
| `preview` | Redrive Preview | `.preview` | `redrive-preview` |
| `production` | Redrive | none | `redrive` |

The value must agree with the EAS build environment/profile.

##### `EXPO_PUBLIC_API_ORIGIN`

The origin joined with `/api/mobile/v1` by the mobile request client. Do not add
that path to the value itself and do not use a trailing endpoint path.

```dotenv
# iOS simulator or Expo web
EXPO_PUBLIC_API_ORIGIN=http://localhost:3000

# Android emulator
EXPO_PUBLIC_API_ORIGIN=http://10.0.2.2:3000

# Physical device on the same trusted LAN (replace with the computer's address)
EXPO_PUBLIC_API_ORIGIN=http://192.168.1.20:3000

# Signed Preview and Production builds
EXPO_PUBLIC_API_ORIGIN=https://preview-api.example.com
EXPO_PUBLIC_API_ORIGIN=https://example.com
```

The client rejects plain HTTP outside recognised local/private development
addresses. A physical device cannot use `localhost` to reach the development
computer.

##### `EXPO_PUBLIC_LINK_HOST`

The host only—without `https://`, a path, port, or trailing slash—used to build
iOS associated domains and Android verified App Links:

```dotenv
EXPO_PUBLIC_LINK_HOST=preview.example.com
```

If omitted, `app.config.ts` derives it from an HTTPS
`EXPO_PUBLIC_API_ORIGIN`. The domain still needs valid Apple and Android
association files for every signed application identity. See Expo's
[linking overview](https://docs.expo.dev/linking/overview/).

##### `EXPO_PUBLIC_EAS_PROJECT_ID`

The UUID of the organization-owned EAS project. Obtain it after running
`npx eas-cli@latest init` from `apps/mobile`, or view it with
`npx eas-cli@latest project:info`. This is project metadata, not a secret:

```dotenv
EXPO_PUBLIC_EAS_PROJECT_ID=00000000-0000-0000-0000-000000000000
```

Do not use the example UUID. Development, Preview, and Production variants in
this repository are intended to belong to the same approved EAS project unless
the owner deliberately chooses a multi-project design.

##### Provider-facing public variables

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`: use only `pk_test_...` in Development
  and Preview; use the matching `pk_live_...` value only when the Production
  payment slice is approved. Never use `sk_...` here.
- `EXPO_PUBLIC_SENTRY_DSN`: optional public DSN for the future mobile monitoring
  integration. Leave blank until the SDK and redaction policy are implemented.
- `EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY`: an iOS Maps SDK key restricted to the
  approved Apple bundle identifiers and required APIs.
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY`: a separate Android Maps SDK key
  restricted to the application IDs, signing-certificate fingerprints, and
  required APIs.

These variables are reserved but their native integrations belong to the
corresponding Section 9 feature slices. Leaving them blank is safer than adding
unrestricted or mismatched credentials prematurely.

#### Local setup and validation

1. Copy server examples into the ignored root `.env.local`.
2. Copy `apps/mobile/.env.example` to `apps/mobile/.env.local` and set only the
   public mobile values.
3. Start the Next.js server from the repository root with `npm run dev`.
4. Start Expo from `apps/mobile` with `npx expo start`.
5. After changing an Expo public variable, perform a full app reload. Native
   app-identity or plugin changes require a new development build.

Validate the resolved public config without printing any server secret:

```powershell
Set-Location apps/mobile
npx expo config --type public
npx expo-doctor
```

#### EAS environment setup

After the owner has initialized and linked the EAS project, create the public
variables separately under Project settings → Environment variables for
`development`, `preview`, and `production`. Public bundle values should use
plain-text visibility because they are extractable from the app regardless of
dashboard visibility.

Verify each group from `apps/mobile`:

```powershell
npx eas-cli@latest env:list --environment development
npx eas-cli@latest env:list --environment preview
npx eas-cli@latest env:list --environment production
```

For SDK 55 and later, EAS Update requires an explicit environment. Use the same
environment that produced the binary:

```powershell
npx eas-cli@latest update --environment preview
npx eas-cli@latest update --environment production
```

Do not pull Preview or Production values over an existing local file without
reviewing the destination. Expo's [EAS variable management guide](https://docs.expo.dev/eas/environment-variables/manage/)
documents dashboard creation, `env:list`, and `env:pull`.

#### Environment matrix

| Variable | Development | Preview | Production |
|---|---|---|---|
| `MOBILE_TOKEN_ISSUER` | Local origin | Stable Preview HTTPS origin | Canonical Production HTTPS origin |
| `MOBILE_TOKEN_AUDIENCE` | `redrive-mobile-api` | Same | Same |
| Signing key ID/pair | Development-only pair | Independent Preview pair | Independent Production pair |
| Refresh-token pepper | Development-only | Independent Preview secret | Independent Production secret |
| `MOBILE_ALLOW_AUTH_PREVIEWS` | `false`, temporarily `true` only when intentionally testing fallback | `false` | `false` |
| `EXPO_ACCESS_TOKEN` | Optional dedicated token | Prefer a separately revocable Preview token | Prefer a separately revocable Production token |
| `EXPO_PUBLIC_APP_ENV` | `development` | `preview` | `production` |
| `EXPO_PUBLIC_API_ORIGIN` | Local emulator/LAN origin | Stable Preview HTTPS origin | Canonical Production HTTPS origin |
| `EXPO_PUBLIC_LINK_HOST` | Usually blank | Preview association host | Production association host |
| Stripe publishable key | Blank or test | Test | Live only after payment approval |
| Sentry DSN | Blank or development project | Preview project/environment | Production project/environment |
| Maps keys | Blank or restricted development keys | Restricted Preview identities | Restricted Production identities |

## 3. MongoDB Atlas

### `DATABASE_URL`

Redrive uses Prisma with MongoDB. The value must be a `mongodb://` or `mongodb+srv://` connection string.

1. Create or select a project in [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a free/Flex or paid database deployment.
3. Open **Security → Database Access** and create a database user. This is different from your Atlas website login.
4. Give the user read/write access to the Redrive database. Avoid broad administrative access in production.
5. Open **Security → Network Access** and permit connections from your application.
6. Open the deployment, choose **Connect → Drivers**, select Node.js, and copy the connection string.
7. Replace the username and password placeholders, and add `/redrive` before the query string.

Example shape:

```dotenv
DATABASE_URL="mongodb+srv://redrive_app:password@cluster0.abcde.mongodb.net/redrive?retryWrites=true&w=majority"
```

Important details:

- If the password contains characters such as `@`, `:`, `/`, `?`, `#`, `%`, or `&`, URL-encode it. In a browser console, `encodeURIComponent("your password")` will produce the encoded form.
- Vercel functions do not normally have one fixed outbound IP on standard deployments. A simple setup may use Atlas access-list entry `0.0.0.0/0`, but that permits network attempts from anywhere. Use a strong unique database password, minimum database privileges, TLS, monitoring, and rotate leaked credentials. For stronger production isolation, use an Atlas/Vercel integration or networking option appropriate to your plan.
- Database access still requires the correct database username and password even when `0.0.0.0/0` is used.

After configuring `DATABASE_URL`, apply the Prisma schema:

```powershell
npx prisma generate
npx prisma db push
```

This project uses MongoDB, so `prisma db push` is used instead of SQL migrations. Run it once for a new database and again after `prisma/schema.prisma` changes. The recent email-verification fields also require this command.

Official references: [Connect to an Atlas deployment](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/) and [manage the Atlas IP access list](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/).

### `DATABASE_POOL_SIZE`

Optional. Sets `maxPoolSize` on the MongoDB driver connection
(`app/libs/prismadb.ts`). It defaults to `5`, which suits Vercel's serverless
model — many short-lived function instances, each holding a small pool. Raise it
only if you run the app as a long-lived Node server that needs more concurrent
connections.

```dotenv
DATABASE_POOL_SIZE="5"
```

### Backup restore-drill (`RESTORE_DRILL_*`)

`scripts/restore-drill.mjs` (and the monthly `backup-restore-drill.yml` workflow)
prove the production backup can actually be restored. It reads
`RESTORE_DRILL_SOURCE_URI` (a **read-only** connection) and
`RESTORE_DRILL_TARGET_URI` (a disposable scratch cluster), with optional
`RESTORE_DRILL_SOURCE_DB` and `RESTORE_DRILL_MIN_COLLECTIONS` overrides. In CI
these are GitHub Actions secrets, not `.env` values. Full setup — including how
to create a read-only Atlas user and a scratch cluster — is in
[`backups-and-restore-drill.md`](backups-and-restore-drill.md). The running
application never reads any of these.

## 4. NextAuth, site URLs, and access control

### `NEXTAUTH_SECRET`

This is a private random value used to sign and encrypt authentication data. Generate it once and use the same value for all production deployments of this Vercel project.

PowerShell option:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

OpenSSL option:

```bash
openssl rand -base64 32
```

Do not use a memorable sentence. Changing the value invalidates existing sessions and logs users out.

### `NEXTAUTH_URL`

This is the exact public origin of the app, with no path and normally no trailing slash.

Local:

```dotenv
NEXTAUTH_URL="http://localhost:3000"
```

Production:

```dotenv
NEXTAUTH_URL="https://your-domain.com"
```

If the production deployment is only using its Vercel domain:

```dotenv
NEXTAUTH_URL="https://your-project.vercel.app"
```

Do not put `/api/auth/callback/google` into `NEXTAUTH_URL`; that path is added by NextAuth.

### `NEXT_PUBLIC_SITE_URL`

The canonical public origin used to build absolute links in places that run
outside a request context — Stripe Checkout and Connect return URLs, emails, and
share links. `app/libs/siteUrl.ts` falls back to `NEXTAUTH_URL`, then to
`http://localhost:3000`, and always strips a trailing slash.

```dotenv
# Local
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Production
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

Because it is a `NEXT_PUBLIC_` value it is embedded into the browser bundle at
build time, so set it before the production build and redeploy after changing it.
Keep it identical to `NEXTAUTH_URL` in production unless you deliberately serve
links from a different origin.

### `RATE_LIMIT_SECRET`

A separate HMAC key used only to hash account identifiers and IP addresses before
they are written to rate-limit and audit records, so those tables never store raw
addresses. Generate it independently of every other secret:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

```dotenv
RATE_LIMIT_SECRET="an-independent-hmac-secret"
```

Changing it resets the identity of existing rate-limit buckets (counters
effectively start over) and makes historic audit hashes non-comparable. The
rate-limit and cache design is described in
[`cache-and-rate-limiting.md`](cache-and-rate-limiting.md).

### `ENABLE_LEGACY_API_AUTH`

Controls the deprecated `/api/auth/login` compatibility endpoint. Keep it
`false` (or unset). Only set it to `true` briefly, and only if a trusted
first-party integration still depends on that route, then set it back:

```dotenv
ENABLE_LEGACY_API_AUTH="false"
```

New mobile and API clients must use `/api/mobile/v1` instead. This switch is not
a way to give the native app a password login.

### `ADMIN_EMAILS`

A comma-separated allow-list of email addresses that may reach `/admin` after a
normal password sign-in, in addition to any account whose database `role` is
already `ADMIN` (`app/libs/adminAuth.ts`). Comparison is case-insensitive and
whitespace is trimmed.

```dotenv
ADMIN_EMAILS="founder@example.com,ops@example.com"
```

Use accounts that already exist in Redrive. Keep this server-only — it is not a
`NEXT_PUBLIC_` value — and use different lists for Preview and Production if the
reviewer set differs.

### `SESSION_IDLE_TIMEOUT_MINUTES`

This controls the inactivity timeout for web and native sessions. The default is
60 minutes. Values from 15 minutes through 10,080 minutes (seven days) are
accepted; missing or invalid values safely use the 60-minute default.

```dotenv
SESSION_IDLE_TIMEOUT_MINUTES="60"
```

Web activity is recorded only from real browser interaction, not notification
or presence polling. Native sessions are checked when their short-lived access
token refreshes and whenever the app returns to the foreground. Web sessions
also have a seven-day absolute lifetime, even if continuously active. See
[`session-timeouts.md`](session-timeouts.md) for the complete behaviour.

### `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

These values power the **Continue with Google** button. They are unrelated to the Google Maps API keys.

1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create or select the project used for Redrive.
3. Configure the OAuth consent/branding screen with the app name, support email, audience and contact details.
4. If the OAuth app is in testing mode, add the email addresses that are allowed to test it. For general public access, complete Google's required publication/verification steps for the scopes you use.
5. Choose **Create credentials → OAuth client ID**.
6. Select **Web application**.
7. Add these **Authorized JavaScript origins**:

```text
http://localhost:3000
https://your-project.vercel.app
https://your-domain.com
```

8. Add these exact **Authorized redirect URIs**:

```text
http://localhost:3000/api/auth/callback/google
https://your-project.vercel.app/api/auth/callback/google
https://your-domain.com/api/auth/callback/google
```

9. Copy **Client ID** into `GOOGLE_CLIENT_ID`.
10. Copy **Client secret** into `GOOGLE_CLIENT_SECRET`.

Only add the origins and callback URLs you actually use. Google OAuth redirect URIs must match exactly; a mismatch produces `redirect_uri_mismatch`.

Preview deployment URLs change per deployment. Google OAuth does not accept an arbitrary wildcard callback. For reliable Preview authentication, use a stable branch/custom preview domain, add its exact callback URI in Google Cloud, and give that branch a matching Preview `NEXTAUTH_URL` override in Vercel. Otherwise, validate Google sign-in on localhost and the stable production domain.

Official reference: [Google OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred).

## 5. Email verification with Gmail SMTP

The app sends a six-digit verification code with open-source Nodemailer. No paid email SDK is required.

### Recommended Gmail values

```dotenv
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-sender@gmail.com"
SMTP_PASS="your-google-app-password"
EMAIL_FROM="Redrive <your-sender@gmail.com>"
```

For port `587`, `SMTP_SECURE` must be `false`. Nodemailer connects normally and upgrades the connection with STARTTLS. Direct TLS normally uses port `465` with `SMTP_SECURE=true`; do not mix the two combinations.

### Create a Google app password

1. Use a dedicated Google account for transactional Redrive email when possible.
2. Open the Google account's **Security** settings.
3. Enable **2-Step Verification**.
4. Open **App passwords**.
5. Create an app password for Redrive.
6. Google displays a 16-character password. Put that value in `SMTP_PASS`. It is not the account's normal login password.
7. Put the full Gmail address in `SMTP_USER` and use the same address inside `EMAIL_FROM`.

If **App passwords** is unavailable, the account may be managed by an organisation, enrolled in Advanced Protection, or configured with security-key-only 2-Step Verification. Use another SMTP provider or a suitable Google Workspace configuration rather than weakening the account.

Google revokes app passwords after the main Google account password is changed. Generate a new app password and update Vercel if email suddenly stops after a password change.

Gmail is useful for development and low-volume sending, but it has sending limits and is not a full transactional email service. For a larger production workload, use an SMTP provider with a verified domain. The same variables work; replace the host, port, security setting, username, password and sender with that provider's SMTP credentials.

Official reference: [Google Account app passwords](https://support.google.com/accounts/answer/185833).

### Local-development fallback

When `SMTP_HOST`, `SMTP_USER`, or `SMTP_PASS` is blank in development, Redrive logs and displays a local preview code. This makes development free and prevents the need to send real email while building.

Production deliberately has no fallback: registration returns an email-configuration error if SMTP credentials are missing. Configure SMTP in Vercel before testing production registration.

### `PRIVACY_CONTACT_EMAIL` and `SUPPORT_CONTACT_EMAIL`

Plain public-facing addresses printed on the policy, legal, and support content
pages (`app/[slug]/page.tsx`). They are not secrets and are not used to send
mail — only displayed. If unset they default to `privacy@redrive.com.au` and
`support@redrive.com.au`.

```dotenv
PRIVACY_CONTACT_EMAIL="privacy@your-domain.com"
SUPPORT_CONTACT_EMAIL="support@your-domain.com"
```

Set them to addresses you actually monitor before launch, and make sure the
mailbox or forwarding rule exists.

## 6. Google Maps and Places

Google Maps Platform generally requires a billing account even when usage is covered by no-cost allowances. Configure budgets, alerts and quotas before making the app public.

Enable the APIs used by the project in [Google Cloud API Library](https://console.cloud.google.com/apis/library):

- **Maps JavaScript API** for the interactive map.
- The compatible **Places API** used by the existing autocomplete and place-details endpoints.

### `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Create a browser API key for Maps JavaScript. Because the variable begins with `NEXT_PUBLIC_`, users can see the key. Security comes from key restrictions, not concealment.

Set:

- **Application restriction:** Websites/HTTP referrers.
- **Website restrictions:**

```text
http://localhost:3000/*
https://your-project.vercel.app/*
https://your-domain.com/*
```

- **API restriction:** Maps JavaScript API only.

Example:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIza..."
```

### `GOOGLE_PLACES_API_KEY`

Create a different API key for server-side address autocomplete and place details.

- Do not prefix it with `NEXT_PUBLIC_`.
- Restrict it to only the Places API version enabled for this project.
- Standard Vercel functions may not provide a stable outbound IP, so IP restriction may not work unless you use Vercel features that provide stable egress. API restrictions, quotas and monitoring remain important.

```dotenv
GOOGLE_PLACES_API_KEY="AIza..."
```

### `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`

This optional value selects a cloud-configured map style.

1. In Google Maps Platform, open **Map Management**.
2. Create a JavaScript map ID and optionally associate a cloud map style.
3. Copy only the map ID.

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID="your-map-id"
```

Leave it empty if you want the default Google map style:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=""
```

Official references: [Google Maps API security guidance](https://developers.google.com/maps/api-security-best-practices) and [cost controls, budgets and quotas](https://developers.google.com/maps/billing-and-pricing/manage-costs).

## 7. Cloudinary image storage

Create a Cloudinary account and open the product environment dashboard.

### Values from the Cloudinary dashboard

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

- **Cloud name** identifies the Cloudinary product environment and is safe to expose.
- **API key** identifies API requests. Keep it out of casual public sharing even though it is not sufficient alone for signed operations.
- **API secret** authorizes signed operations and must remain server-only.

### Upload authentication

No Cloudinary upload preset is required. Images are posted to the authenticated `/api/upload` route, and that server route signs the Cloudinary request with `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.

The route accepts JPG, PNG, and WebP images up to 5 MB and stores them under `redrive/profiles`, `redrive/licenses`, `redrive/listings`, or `redrive/chat`. Keep the API secret server-only. If an old unsigned `redrive` preset exists in Cloudinary and nothing else uses it, disable or delete it to reduce public upload exposure.

Official reference: [Cloudinary authenticated uploads](https://cloudinary.com/documentation/upload_images#authenticated_requests).

## 8. Licence verification and OCR

The driver-licence readiness check reads the front and back licence images with
Google Cloud Vision, then stores the extracted document number encrypted and a
keyed hash of it for duplicate detection. Three variables control this.

### `GOOGLE_CLOUD_VISION_API_KEY`

A dedicated Google Cloud API key used server-side by `app/libs/googleVision.ts`
(sent as the `X-Goog-Api-Key` header to `vision.googleapis.com`).

1. In the [Google Cloud API Library](https://console.cloud.google.com/apis/library),
   enable **Cloud Vision API** on the project (this needs a billing account).
2. In **APIs & Services → Credentials**, choose **Create credentials → API key**.
3. Open the new key and set **API restrictions → Restrict key → Cloud Vision API**
   only.
4. Application restriction: leave as **None** (standard Vercel functions have no
   stable outbound IP), and rely on the API restriction, quotas, and budget
   alerts instead.
5. The app validates the shape `AIza…` (39 characters). A malformed value is
   reported as `GOOGLE_CLOUD_VISION_API_KEY_INVALID`.

```dotenv
GOOGLE_CLOUD_VISION_API_KEY="AIza..."
```

Licence images are sent to Google only when an authenticated user starts the
licence check from their profile.

### `LICENSE_DATA_ENCRYPTION_KEY`

An AES-256-GCM key that encrypts recoverable licence and card numbers at the
application layer (`app/libs/licenseDataProtection.ts`). It must decode to
**exactly 32 bytes**. Generate it as base64:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

```bash
openssl rand -base64 32
```

```dotenv
LICENSE_DATA_ENCRYPTION_KEY="the-base64-value-above"
```

In non-production only, if this is blank the code derives a key from
`NEXTAUTH_SECRET` so local development works without extra setup. Production
throws if it is missing. Rotating it makes previously stored encrypted licence
values undecryptable, so plan a re-encryption or re-verification path before
changing it.

### `LICENSE_DATA_HMAC_KEY`

A separate secret used to build non-reversible HMAC-SHA-256 hashes for
duplicate-licence detection. Generate it independently of the encryption key:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

```dotenv
LICENSE_DATA_HMAC_KEY="an-independent-random-secret"
```

If unset the code falls back to `RATE_LIMIT_SECRET`, then `NEXTAUTH_SECRET`;
set an explicit value in production so duplicate detection does not break when
those other secrets rotate. Changing it invalidates existing duplicate-check
hashes.

## 9. Stripe Connect marketplace payments

Booking payment collection uses Stripe Checkout plus Stripe Connect. Use
**test-mode** keys locally and in Preview; use live keys only once the payment
slice is approved for Production.

### `STRIPE_SECRET_KEY`

1. Create a [Stripe account](https://dashboard.stripe.com/) and, if you want
   marketplace payouts, enable **Connect**.
2. Keep the dashboard in **Test mode** while building.
3. Open **Developers → API keys** and copy the **Secret key** (`sk_test_…`).
4. Store it server-side only — it is read by `app/libs/stripe.ts` and never
   exposed to the browser.

```dotenv
STRIPE_SECRET_KEY="sk_test_..."
```

The native app uses the matching **publishable** key
(`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, covered under the Expo application
variables in Section 2) — never put an `sk_…` value there.

### `STRIPE_WEBHOOK_SECRET`

`/api/stripe/webhook` verifies every incoming event signature with this value.

- **Local:** run the [Stripe CLI](https://docs.stripe.com/stripe-cli):
  `stripe listen --forward-to localhost:3000/api/stripe/webhook`. The CLI prints
  a `whsec_…` signing secret for that session — use it as
  `STRIPE_WEBHOOK_SECRET`.
- **Deployed:** in **Developers → Webhooks**, add an endpoint pointing at
  `https://<your-domain>/api/stripe/webhook`, subscribe to at least
  `checkout.session.completed`, `checkout.session.expired`,
  `payment_intent.payment_failed`, and `account.updated`, then copy that
  endpoint's **Signing secret**.

```dotenv
STRIPE_WEBHOOK_SECRET="whsec_..."
```

Each endpoint (local CLI, Preview, Production) has its own signing secret; do not
share one value across environments.

## 10. API request monitoring sampling

`app/libs/apiMonitoring.ts` records lightweight, payload-free telemetry for API
routes. Both variables are optional and only take effect in a Vercel production
environment.

| Variable | Default | Meaning |
|---|---|---|
| `API_MONITOR_SUCCESS_SAMPLE_RATE` | `0.25` | Fraction of 2xx/3xx responses recorded |
| `API_MONITOR_CLIENT_ERROR_SAMPLE_RATE` | `0.5` | Fraction of handled 4xx responses recorded |

- All 5xx responses are always recorded regardless of these values.
- Accepted range is `0.01`–`1`; out-of-range or non-numeric values fall back to
  the defaults.
- Set both to `1` for full sampling while investigating an incident, then revert.

```dotenv
API_MONITOR_SUCCESS_SAMPLE_RATE="0.25"
API_MONITOR_CLIENT_ERROR_SAMPLE_RATE="0.5"
```

You do not need to set these locally or in `.env.local`.

## 11. Mobile app store association and deep links

These identifiers are served by `/.well-known/apple-app-site-association` and
`/.well-known/assetlinks.json` (`app/libs/mobileAssociations.ts`) so that iOS
Universal Links and Android App Links open the installed app instead of the
website. They are **not secrets**, but they must match the real signing accounts,
and the routes throw if a value is malformed.

Leave them blank until `apps/mobile` exists and the organization-owned Apple
Developer and Google Play / EAS signing accounts are set up.

### `MOBILE_APPLE_TEAM_ID`

The 10-character Apple Developer Team ID (uppercase letters and digits). Find it
in [Apple Developer → Membership details](https://developer.apple.com/account),
or in App Store Connect under the organization name.

```dotenv
MOBILE_APPLE_TEAM_ID="ABCDE12345"
```

### `MOBILE_IOS_BUNDLE_ID` and `MOBILE_ANDROID_PACKAGE`

The production identifiers are already set in `.env.example`:

```dotenv
MOBILE_IOS_BUNDLE_ID="au.com.redrive.app"
MOBILE_ANDROID_PACKAGE="au.com.redrive.app"
```

Only `au.com.redrive.app` or a single lowercase suffix such as
`au.com.redrive.app.preview` is accepted. Use the suffixed identifier in the
environment whose EAS `EXPO_PUBLIC_APP_ENV` is `preview` or `development`, and
the bare identifier in Production, so each build variant has its own association.

### `MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS`

The SHA-256 fingerprint(s) of the app-signing certificate, formatted as 32
uppercase hex pairs separated by colons. Sources:

- **Google Play App Signing:** Play Console → your app → **Test and release →
  App integrity → App signing** → copy the *SHA-256 certificate fingerprint*.
- **EAS-managed credentials:** run `npx eas-cli@latest credentials` from
  `apps/mobile`, choose Android → the build profile, and read the SHA-256.
- **A local keystore:**
  `keytool -list -v -keystore my.keystore -alias my-alias`.

```dotenv
MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS="AB:CD:EF:...:99"
```

During a signing-key rotation, list both the old and new fingerprints separated
by commas until the old key is fully retired.

## 12. Scheduled notification secret

### `CRON_SECRET`

Generate another independent random secret. Do not reuse `NEXTAUTH_SECRET`, a database password, or any provider credential.

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Add the output as:

```dotenv
CRON_SECRET="your-independent-random-value"
```

Vercel sends `Authorization: Bearer <CRON_SECRET>` to each scheduled endpoint
when this specially named variable exists, and every cron route rejects requests
without an exact match. Add the value to the Vercel project's env vars as well
as `.env.local` — Vercel only injects the header when it sees `CRON_SECRET` set.

`vercel.json` schedules **four** endpoints, all UTC (Adelaide's offset shifts
with daylight saving):

| Path | Schedule | |
|---|---|---|
| `/api/cron/notifications` | `0 * * * *` | hourly — notification lifecycle + saved-search alerts |
| `/api/cron/booking-maintenance` | `0 * * * *` | hourly — expire unpaid `APPROVED` bookings, iCal sync |
| `/api/cron/payouts` | `30 1 * * *` | 01:30 daily — release held payments to hosts |
| `/api/cron/security-maintenance` | `15 2 * * *` | 02:15 daily — retention-window cleanup |

Official reference: [Vercel cron job security](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).

## 13. Error tracking (Sentry)

Redrive reports server, edge, and browser errors to [Sentry](https://sentry.io).
The SDK is a **no-op when no DSN is set**, so local dev and un-configured deploys
carry no overhead — but production without a DSN hides exactly the failures you
most need to see, so `validateServerEnv()` logs a loud warning on a production
boot without `SENTRY_DSN`.

### Create the project and DSN

1. Create a free Sentry account, then **Projects → Create project → Next.js**.
   The free "Developer" plan covers early-stage error volume.
2. Open **Settings → Projects → (your project) → Client Keys (DSN)** and copy the
   **DSN**. It looks like
   `https://<publicKey>@o<org>.ingest.sentry.io/<projectId>`.
3. The DSN is not a secret in the classic sense (it only allows *sending*
   events), but treat it as sensitive server config anyway.

```dotenv
SENTRY_DSN="https://<publicKey>@o<org>.ingest.sentry.io/<projectId>"
NEXT_PUBLIC_SENTRY_DSN="https://<publicKey>@o<org>.ingest.sentry.io/<projectId>"
```

- `SENTRY_DSN` is read by `sentry.server.config.ts` / `sentry.edge.config.ts`.
  Server env vars are available on the Edge runtime on Vercel, so this one value
  covers both.
- `NEXT_PUBLIC_SENTRY_DSN` is read by `instrumentation-client.ts` and embedded in
  the browser bundle at build time. Use the same project's DSN.
- Both can be the *same* DSN. Use a **separate Sentry project (or environment)**
  for Preview vs Production so their issues don't mix.

### Trace sampling (optional)

```dotenv
SENTRY_TRACES_SAMPLE_RATE="0.1"          # server, default 0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE="0.05"   # browser, default 0.05
```

Errors are always sent at 100%; these only control performance-tracing volume.
Lower them if you approach the plan's transaction quota.

### Source-map upload (deploy environment only)

For readable stack traces, the deploy build uploads source maps.
`next.config.js` wraps the config with `withSentryConfig` and reads three values
— they are **inert unless `SENTRY_AUTH_TOKEN` is set**, so local and CI builds
skip the upload entirely.

1. **Settings → Auth Tokens → Create New Token** (or an
   [Organization Auth Token](https://docs.sentry.io/account/auth-tokens/)) with
   the `project:releases` and `org:read` scopes.
2. Add these **only to the Vercel Production (and Preview) environment**, not to
   `.env.local`:

```dotenv
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="redrive"
SENTRY_AUTH_TOKEN="sntrys_..."
```

Official reference: [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/).

## 14. Realtime updates (Pusher)

Chat, typing indicators, read receipts, and notification badges update live over
**Pusher Channels** when configured, and fall back to SSE polling otherwise —
nothing breaks if Pusher is absent.

1. Create a free account at <https://pusher.com> → **Channels** → create an app.
   Choose a cluster close to your users; `ap4` is Sydney. The free tier allows
   200k messages/day and 100 concurrent connections — no card required.
2. From the app's **App Keys** tab, set all seven variables together:

```dotenv
NEXT_PUBLIC_REALTIME_ENABLED="1"
NEXT_PUBLIC_PUSHER_KEY="<key>"
NEXT_PUBLIC_PUSHER_CLUSTER="ap4"
PUSHER_APP_ID="<app_id>"
PUSHER_KEY="<key>"
PUSHER_SECRET="<secret>"
PUSHER_CLUSTER="ap4"
```

- The `NEXT_PUBLIC_*` values are embedded in the browser bundle (expected — the
  key alone cannot publish or read a private channel).
- `PUSHER_SECRET` is a real secret: it signs private-channel authorisations and
  all server-side publishes. Keep it server-only.
- Set them **all or none**. A partial set leaves the client trying Pusher and
  failing over to SSE on every load.
- Leave client events **off** in the Pusher app settings — Redrive never uses
  them.

To turn realtime back off, unset `NEXT_PUBLIC_REALTIME_ENABLED` (or set it to
anything other than `1` / `true`) and redeploy.

Full architecture, channel model, and cost-ceiling guidance:
[`realtime.md`](realtime.md).

## 15. Rate-limit store (Upstash Redis)

Rate limiting for sensitive routes (login, reservation, upload, …) uses a shared
fixed-window counter. With **Upstash Redis** it's one atomic op per rule; without
it, the counter lives in the MongoDB `RateLimitBucket` collection — correct, but
it adds a round-trip on exactly the requests that most need to be fast.

1. Create a database at <https://upstash.com> (free tier: 500K commands/month,
   256 MB — plenty for early-stage rate-limit traffic).
2. On the database page, copy the **REST** URL and token (not the Redis
   protocol URL):

```dotenv
UPSTASH_REDIS_REST_URL="https://<name>.upstash.io"
UPSTASH_REDIS_REST_TOKEN="<rest-token>"
```

3. Redeploy — no code change. Nothing else in the app uses Redis. Set both or
   neither.

A Redis outage fails **open** (requests are allowed; the small in-process burst
filter still applies). Details: [`cache-and-rate-limiting.md`](cache-and-rate-limiting.md).

## 16. SMS notifications (Twilio)

Redrive's notification layer can deliver an SMS channel alongside email and push.
It is **off unless `SMS_PROVIDER=twilio`** and the Twilio credentials are set;
otherwise SMS notifications are logged and skipped (`app/libs/notifications/sms.ts`).

1. Create a [Twilio](https://www.twilio.com/) account and buy (or use the trial)
   a phone number with SMS capability for your region. For Australian A2P
   traffic you may need an alphanumeric sender ID or a registered number —
   follow Twilio's onboarding.
2. From the [Twilio Console](https://console.twilio.com/) dashboard, copy the
   **Account SID** (`AC…`) and **Auth Token**.

```dotenv
SMS_PROVIDER="twilio"
SMS_FROM="+15551234567"            # your Twilio number, E.164 — or a sender ID
SMS_TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
SMS_TWILIO_AUTH_TOKEN="your-auth-token"
```

- `SMS_TWILIO_AUTH_TOKEN` is a full secret — server-only, sensitive, use
  independent values per environment.
- Leave `SMS_PROVIDER` unset in Development and Preview unless you're specifically
  testing SMS delivery; Twilio charges per message.

Official reference: [Twilio Programmable Messaging](https://www.twilio.com/docs/messaging).

## 17. Operational toggles

Small switches that change runtime behaviour. None are secrets and all have safe
defaults.

| Variable | Default | Effect |
|---|---|---|
| `DATABASE_POOL_SIZE` | `5` | MongoDB driver `maxPoolSize` — see Section 3 |
| `DEPOSIT_PREAUTH_ENABLED` | `false` | `true` activates security-deposit pre-authorisation on bookings (`app/libs/deposit.ts`). Leave off until the deposit slice is approved and tested against Stripe test mode. |
| `PUSH_DISABLED` | `false` | `true` hard-disables all Expo push delivery regardless of stored device tokens — a kill switch for the push channel |
| `LOG_LEVEL` | `info` in prod, `debug` otherwise | `debug` \| `info` \| `warn` \| `error` — the minimum level `app/libs/logger.ts` emits |
| `MOBILE_ALLOW_AUTH_PREVIEWS` | `false` | Local/test only — see Section 2. Ignored in production. |
| `ENABLE_LEGACY_API_AUTH` | `false` | Deprecated `/api/auth/login` compatibility route — see Section 4 |

```dotenv
DEPOSIT_PREAUTH_ENABLED="false"
PUSH_DISABLED="false"
```

## 18. Add variables to Vercel using the dashboard

### First deployment

1. Push the project to GitHub, GitLab or Bitbucket.
2. Open [Vercel's new-project page](https://vercel.com/new) and import the repository.
3. Confirm the framework preset is **Next.js** and the project root is the repository root.
4. Before deploying, expand **Environment Variables**. If the project already exists, use **Project → Settings → Environment Variables**.
5. For each row in `.env.example`:
   - Put the variable name in **Key**, for example `DATABASE_URL`.
   - Put only its value in **Value**.
   - Do not enter `DATABASE_URL=` in the Key or Value field.
   - Do not include explanatory comments.
   - Quotes are normally unnecessary in the Vercel Value field. For `EMAIL_FROM`, enter `Redrive <your-sender@gmail.com>` as the value.
6. Select the environment targets described below.
7. Save the variables and deploy.

### Which Vercel environments to select

Vercel provides Development, Preview and Production environments.

Recommended initial configuration:

| Variable group | Development | Preview | Production |
|---|---:|---:|---:|
| Database | Optional via Vercel CLI | Yes, preferably a non-production database | Yes |
| NextAuth secret | Optional via CLI | Yes | Yes |
| NextAuth URL | Usually local file | Stable preview domain only | Yes, production origin |
| Google OAuth | Optional via CLI | Only with an authorized stable preview callback | Yes |
| SMTP | Optional; local fallback exists | Yes for end-to-end testing | Yes |
| Maps/Places | Optional via CLI | Yes if testing those features | Yes |
| Licence OCR + data keys | Optional via CLI | Yes if testing licence checks | Yes |
| Cloudinary | Optional via CLI | Yes if testing uploads | Yes |
| Stripe (test keys) | Optional via CLI + Stripe CLI | Yes, test mode | Yes, live keys only after approval |
| Cron secret | Optional | Yes | Yes |
| Sentry DSNs | Optional (dev project) | Preview project/env | Yes, Production project/env |
| Sentry `ORG`/`PROJECT`/`AUTH_TOKEN` | No | Preview if uploading maps | Yes |
| Pusher (7 vars) | Optional | If testing realtime | If chat/notification live updates are on |
| Upstash Redis | Optional | Optional | Recommended once traffic is real |
| Twilio SMS | No | If testing the SMS channel | If the SMS channel is on |
| Mobile issuer/audience | Local `.env.local` | Stable Preview API identity | Canonical Production API identity |
| Mobile signing key ID/private/public map | Development-only pair | Independent Preview pair | Independent Production pair |
| Mobile refresh-token pepper | Development-only secret | Independent Preview secret | Independent Production secret |
| Expo push access token | When testing secured push | Separate Preview token | Separate Production token |

Use separate Preview and Production databases where practical. Preview deployments can execute mutations, registrations and uploads; pointing every branch at the production database risks contaminating real data.

Use independent secrets for Preview and Production. `NEXTAUTH_SECRET`,
`RATE_LIMIT_SECRET`, `SMTP_PASS`, `GOOGLE_PLACES_API_KEY`,
`GOOGLE_CLOUD_VISION_API_KEY`, `LICENSE_DATA_ENCRYPTION_KEY`,
`LICENSE_DATA_HMAC_KEY`, `CLOUDINARY_API_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, `CRON_SECRET`, `SENTRY_AUTH_TOKEN`,
`PUSHER_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `SMS_TWILIO_AUTH_TOKEN`,
`MOBILE_ACCESS_TOKEN_PRIVATE_KEY`, `MOBILE_REFRESH_TOKEN_PEPPER`, and
`EXPO_ACCESS_TOKEN` should be marked sensitive when the Vercel UI offers that
option. `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` and the mobile public-key map
are not secret, but they remain server configuration and should not be copied
into the native application.

### Production URL ordering

There is a small bootstrap sequence when deploying for the first time:

1. Choose the stable production domain you intend to use, such as `your-project.vercel.app` or a custom domain.
2. Set production `NEXTAUTH_URL` to that exact `https://` origin.
3. Add the matching Google OAuth origin and callback URI in Google Cloud.
4. Redeploy after updating the environment variable.

If you later add a custom domain, update both `NEXTAUTH_URL` and Google OAuth's authorized origin/redirect URI, then redeploy.

### Environment changes require a new deployment

Changing a Vercel environment variable does not modify an already-built deployment. Redeploy the latest deployment or push a new commit so the new values are included. This is especially important for `NEXT_PUBLIC_` values because Next.js embeds them into the browser bundle during the build.

Official references: [Vercel environment variables](https://vercel.com/docs/environment-variables), [Vercel environments](https://vercel.com/docs/deployments/environments), and [adding variables in the dashboard](https://vercel.com/kb/guide/how-to-add-vercel-environment-variables).

## 19. Add variables using the Vercel CLI

Install and link the CLI:

```powershell
npm install --global vercel
vercel login
vercel link
```

Add one variable interactively:

```powershell
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
```

Repeat for the required keys and environments. Interactive entry avoids putting secret values into your shell history.

Download the Vercel Development values into a local file:

```powershell
vercel env pull .env.local
```

Be careful: pulling can replace the destination file. Back up any local-only values first if necessary, and never commit the generated `.env.local`.

Deploy a preview:

```powershell
vercel
```

Deploy to production:

```powershell
vercel --prod
```

## 20. Apply the database schema before production use

The package build generates Prisma Client but intentionally does not run `prisma db push`. Apply schema changes explicitly from a trusted local machine.

If `.env.local` points to the intended database:

```powershell
npx prisma db push
```

If you need the Production value from Vercel without manually copying it, pull into a temporary ignored environment file and review the target carefully before running a schema command. Never run `db push` against production until you have confirmed the database URL identifies the intended cluster and database.

`db push` creates every `@unique` / `@@unique` / `@@index` in
`prisma/schema.prisma`. TTL indexes are not schema-expressible — run
`node scripts/create-ttl-indexes.mjs` afterwards. Then verify with:

```powershell
npm run check:db-indexes   # asserts the 19 correctness-critical unique indexes exist
```

A partial `db push` that leaves a unique index missing turns advisory locks,
idempotency keys and dedupe guards into silent no-ops, so make this check part
of your deploy procedure.

## 21. Recommended setup order

1. Create MongoDB Atlas and set `DATABASE_URL`.
2. Generate `NEXTAUTH_SECRET`, `RATE_LIMIT_SECRET`, and `CRON_SECRET` separately.
3. Configure Google OAuth and set `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`,
   `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. Set `ADMIN_EMAILS`.
4. Configure Gmail app password or another SMTP provider, and set the
   privacy/support contact addresses.
5. Enable Google Maps/Places, create two restricted keys, and optionally create a map ID.
6. Enable Cloud Vision and generate `LICENSE_DATA_ENCRYPTION_KEY` and
   `LICENSE_DATA_HMAC_KEY` for the licence check.
7. Configure the three Cloudinary environment variables; no upload preset is needed.
8. Create a Stripe account, set `STRIPE_SECRET_KEY`, and register the webhook
   endpoint to obtain `STRIPE_WEBHOOK_SECRET`. Keep `DEPOSIT_PREAUTH_ENABLED=false`.
9. Create a Sentry project and set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`
   (Section 13). Add `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` to
   Vercel only, for source-map upload.
10. Optional now, needed for live chat/notifications: create a Pusher app and
    set the seven realtime vars (Section 14). Once traffic is real, create an
    Upstash Redis database and set the two rate-limit-store vars (Section 15).
11. Optional: for the SMS notification channel, create a Twilio account and set
    `SMS_PROVIDER` + the Twilio credentials (Section 16).
12. Generate separate mobile RSA key pairs and refresh-token peppers for
    Development, Preview, and Production.
13. Initialize the organization-owned EAS project from `apps/mobile`, then
    record its project ID, and gather the Apple Team ID, bundle/package IDs, and
    Android signing SHA-256 fingerprints.
14. Configure the server-side mobile values in matching Vercel environments and
    the public mobile values in matching EAS environments.
15. Run `npx prisma db push` against the intended Preview database after a
    backup and target check; validate it before Production. Then run
    `npm run check:db-indexes` against that database.
16. Deploy or redeploy the backend. Check the Vercel logs for an
    `env_expected_missing` warning and set anything it lists.
17. Create a signed Preview build and confirm it uses only Preview providers.
18. Complete the verification checklist below.

## 22. Post-deployment checklist

- [ ] The homepage and listing data load without a Prisma connection error.
- [ ] A new email/password account receives a six-digit email.
- [ ] A wrong verification code is rejected.
- [ ] The correct code verifies the account and allows login.
- [ ] **Continue with Google** completes without `redirect_uri_mismatch`.
- [ ] Maps render on a listing.
- [ ] Address autocomplete returns Australian results.
- [ ] A listing image uploads successfully.
- [ ] Starting the licence check from Profile completes OCR without an
      `OCR_CONFIGURATION_ERROR` or licence-encryption error.
- [ ] A Stripe test booking reaches Checkout and the webhook records
      `checkout.session.completed` (HTTP 200, signature accepted).
- [ ] `/admin` is reachable by an `ADMIN_EMAILS` address and refused for others.
- [ ] Vercel shows all four cron endpoints under Cron Jobs and each latest
      execution returns HTTP 200 rather than 401 or 500.
- [ ] A test error appears in the Sentry project for this environment
      (server + browser), and the Vercel logs show no `env_expected_missing`
      warning.
- [ ] If realtime is enabled: opening a chat in two tabs delivers a message
      instantly, and disabling Pusher falls back to SSE without errors.
- [ ] If SMS is enabled: a test notification arrives as an SMS from `SMS_FROM`.
- [ ] `npm run check:db-indexes` passes against the Production database.
- [ ] Preview deployments do not write test data into the production database unless that was an intentional decision.
- [ ] Rate limits reject above-limit requests and expose `Retry-After`
      (and, with Upstash configured, the counter survives a redeploy).
- [ ] The security maintenance job removes expired MongoDB rate-limit buckets.
- [ ] Public listing changes invalidate cached discovery results.
- [ ] No real credential is present in Git history or `.env.example`.
- [ ] `npx expo config --type public` resolves the intended app name, scheme,
      bundle identifier, Android application ID, API origin, and link host for
      each EAS environment.
- [ ] `npx expo-doctor` passes from `apps/mobile`.
- [ ] Development, Preview, and Production use different mobile signing key
      pairs and refresh-token peppers.
- [ ] A signed Preview build talks only to Preview data and providers.
- [ ] Mobile registration, email verification, login, OTP, refresh, device
      logout, logout-all, password reset, and killed-app restoration succeed.
- [ ] No server-only `MOBILE_*` value or `EXPO_ACCESS_TOKEN` appears in the
      compiled application or Expo public configuration.

## 23. Troubleshooting

| Symptom | What to check |
|---|---|
| Prisma cannot connect | Confirm the database user, URL-encoded password, database name and Atlas network access list. |
| Build says `DATABASE_URL` is missing | Add it to the exact Vercel environment used by that deployment, then redeploy. |
| Google reports `redirect_uri_mismatch` | Make the Google redirect URI exactly `<NEXTAUTH_URL>/api/auth/callback/google`. Check protocol, domain and path. |
| Google sign-in works locally but not on Vercel | Add the production origin/callback in Google Cloud and set the Production `NEXTAUTH_URL`. |
| Verification email fails in production | Confirm all six SMTP/email variables exist in Production. Use a Google app password, not the normal password. |
| Gmail reports invalid credentials | Confirm 2-Step Verification, regenerate the app password, remove accidental spaces, and check whether the account permits app passwords. |
| Email lands in spam | Use a dedicated sender; for serious production email, use a verified custom domain and transactional SMTP provider with SPF, DKIM and DMARC. |
| Map shows `RefererNotAllowedMapError` | Add the deployed origin pattern to the browser key's website restrictions. |
| Places requests fail | Confirm the server key, enabled Places API, billing, API restriction and quota. Check Vercel function logs. |
| Cloudinary uploads fail | Confirm `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`; uploads are signed server-side by `/api/upload`, so no upload preset is involved. Check file type (JPG/PNG/WebP) and the 5 MB limit. |
| Cron returns 401 | Confirm `CRON_SECRET` exists in that Vercel environment and redeploy. Do not add `Bearer ` to the stored value. |
| `MIDDLEWARE_INVOCATION_FAILED` / "instrumentation hook" error at boot | A value read during `instrumentation.register()` is malformed, or code logging from the Edge runtime hit an unguarded `process.stdout` (fixed in `app/libs/logger.ts` — keep it that way). Check the deploy logs for the underlying message. |
| Vercel logs show `env_expected_missing` | `SENTRY_DSN`, `CRON_SECRET`, or a `STRIPE_*` value isn't set in that environment. The app still runs, but set them. |
| Errors don't appear in Sentry | Confirm `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (browser, rebuild required) are set for that environment, and that you're looking at the matching Sentry project/environment. Stack traces unreadable → set `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` in the deploy env. |
| Live updates don't arrive / client keeps falling back to SSE | All seven Pusher vars must be present together; a partial set fails over on every load. Check the cluster matches and `NEXT_PUBLIC_REALTIME_ENABLED=1` (rebuild required for the `NEXT_PUBLIC_` values). |
| Rate limiting seems inconsistent across instances | Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` so the shared counter is Redis, not per-instance MongoDB round-trips. |
| SMS notifications never send | `SMS_PROVIDER` must be exactly `twilio` and `SMS_TWILIO_ACCOUNT_SID` / `SMS_TWILIO_AUTH_TOKEN` / `SMS_FROM` all set; otherwise SMS is logged and skipped by design. Check Twilio's message logs for delivery errors. |
| Licence check fails with `OCR_CONFIGURATION_ERROR` / `OCR_SERVICE_DISABLED` | Confirm `GOOGLE_CLOUD_VISION_API_KEY` is a valid `AIza…` key, the Cloud Vision API is enabled, and billing is active on that project. |
| Licence save throws `must be a base64-encoded 32-byte key` | `LICENSE_DATA_ENCRYPTION_KEY` must decode to exactly 32 bytes; regenerate with `openssl rand -base64 32`. |
| Stripe webhook returns 400 `Invalid signature` | The endpoint's signing secret does not match `STRIPE_WEBHOOK_SECRET` for that environment (local CLI, Preview, and Production each have their own). |
| Stripe calls throw `STRIPE_SECRET_KEY is not configured` | Add the `sk_…` key to that Vercel environment and redeploy; never use a `pk_…` value here. |
| `/admin` returns 404/redirect for a known admin | Add the exact lower-cased email to `ADMIN_EMAILS` in that environment, or set the user's DB `role` to `ADMIN`, then redeploy. |
| iOS/Android association route returns 500 | A `MOBILE_APPLE_TEAM_ID` (10 chars), bundle/package ID, or SHA-256 fingerprint is missing or malformed for that environment. |
| A variable remains `undefined` | Confirm its Vercel environment scope and redeploy. For local work, restart `npm run dev` after changing `.env.local`. |
| Mobile API returns `MOBILE_AUTH_UNAVAILABLE` | Confirm the issuer, audience, active key ID, complete PKCS#8 private PEM, valid public-key JSON map, matching public key, and refresh-token pepper exist in that Vercel environment. |
| Mobile API returns `UNAUTHENTICATED` immediately after login | Check that the signing and verification key pair match and that the deployment has not mixed Preview and Production issuer/audience values. |
| Android emulator cannot reach `localhost` | Use `http://10.0.2.2:3000` as `EXPO_PUBLIC_API_ORIGIN`; `localhost` points to the emulator itself. |
| Physical phone cannot reach the local API | Use the development computer's private LAN address, allow the port through the local firewall, and keep both devices on the same trusted network. |
| Preview build uses the wrong app identity or backend | Confirm the EAS build profile uses `environment: preview`, inspect `eas env:list --environment preview`, then rebuild. Public values are embedded at bundle time. |
| An EAS Update has wrong or missing public values | Re-run the update with the explicit matching `--environment`; SDK 55 and later require it. |
| Universal/App Link opens the website instead of the app | Confirm `EXPO_PUBLIC_LINK_HOST`, rebuild the signed binary, publish the correct Apple/Android association files, and verify they include that exact signed app identity. |
| Expo push requests return `UNAUTHORIZED` | If enhanced push security is enabled, confirm the backend's `EXPO_ACCESS_TOKEN` is active and its Expo user/robot has access to the owning project. EAS environment names do not scope the token automatically. Never move it into the app bundle. |

## 24. Rotation and incident response

If a secret is accidentally committed or shared, deleting it from the current file is not sufficient. Treat it as compromised:

1. Rotate/revoke it at the provider.
2. Update the local and Vercel values.
3. Redeploy.
4. Invalidate affected sessions when rotating `NEXTAUTH_SECRET`.
5. Review provider logs, usage and billing for unexpected activity.
6. If it entered Git history, clean the history using an appropriate secret-removal procedure—but rotate first.

Suggested rotation impact:

| Secret | Rotation effect |
|---|---|
| `DATABASE_URL` password | App cannot connect until all environments use the new URL. |
| `NEXTAUTH_SECRET` | Existing sessions become invalid; users log in again. |
| `GOOGLE_CLIENT_SECRET` | Google login fails until Vercel is updated and redeployed. |
| `SMTP_PASS` | Verification delivery fails until updated. |
| `GOOGLE_PLACES_API_KEY` | Address search fails until updated. |
| `GOOGLE_CLOUD_VISION_API_KEY` | Licence OCR fails until updated. |
| `LICENSE_DATA_ENCRYPTION_KEY` | Previously stored encrypted licence/card numbers become undecryptable; plan re-verification. |
| `LICENSE_DATA_HMAC_KEY` | Existing duplicate-check hashes no longer match; duplicates may be re-accepted once. |
| `CLOUDINARY_API_SECRET` | Signed/server uploads fail until updated. |
| `STRIPE_SECRET_KEY` | All Stripe operations fail until updated; revoke the old key in the Stripe dashboard. |
| `STRIPE_WEBHOOK_SECRET` | Webhook events are rejected (400) until the new signing secret is deployed. |
| `RATE_LIMIT_SECRET` | Rate-limit counters reset and historic audit hashes stop matching. |
| `CRON_SECRET` | Cron calls receive 401 until updated (and the Vercel `CRON_SECRET` project var must match). |
| `MOBILE_REFRESH_TOKEN_PEPPER` | Every mobile refresh token is invalidated; users re-authenticate. |
| `PUSHER_SECRET` | Server can't publish or authorise private channels — live updates silently fall back to SSE until updated. Rotate in the Pusher app's App Keys. |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting falls back to the MongoDB bucket (still correct) until updated. Rotate in the Upstash console. |
| `SMS_TWILIO_AUTH_TOKEN` | SMS delivery fails until updated; rotate in the Twilio console and review the message logs for misuse. |
| `SENTRY_AUTH_TOKEN` | Source-map upload fails on the next build (traces become minified); error capture itself is unaffected. Revoke the old token in Sentry. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Not a credential in the usual sense (send-only). If leaked, someone could send junk events — rotate the client key in Sentry and rebuild for the `NEXT_PUBLIC_` one. |
