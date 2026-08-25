# Redrive Environment Variables, Vercel, and Expo/EAS Setup

This guide explains every value in `.env.example`, where to obtain it, how to
configure the Next.js and Expo applications locally, and how to scope values in
Vercel and Expo Application Services (EAS).

> Never paste real secrets into `.env.example`, this document, source code, Git commits, screenshots, or support messages. Put local secrets in `.env.local` or `.env`. Both are ignored by Git in this project.

## 1. What the completed local file looks like

Create `.env.local` in the project root. You may use `.env` instead, but `.env.local` is the conventional choice for machine-specific Next.js secrets.

```dotenv
DATABASE_URL="mongodb+srv://redrive_app:URL_ENCODED_PASSWORD@cluster0.example.mongodb.net/redrive?retryWrites=true&w=majority"

NEXTAUTH_SECRET="a-long-random-secret-generated-for-this-project"
NEXTAUTH_URL="http://localhost:3000"
RATE_LIMIT_SECRET="an-independent-hmac-secret"
REDIS_ENABLED="false"
REDIS_URL="rediss://default:password@redis.example.com:6379"
REDIS_KEY_PREFIX="redrive:development"
GOOGLE_CLIENT_ID="123456789-example.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-example"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-sender@gmail.com"
SMTP_PASS="your-16-character-google-app-password"
EMAIL_FROM="Redrive <your-sender@gmail.com>"

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIza-example-browser-key"
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=""
GOOGLE_PLACES_API_KEY="AIza-example-server-key"

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

CRON_SECRET="another-long-random-secret"

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
| `NEXTAUTH_SECRET` | Yes | Yes | NextAuth web sessions and disabled legacy API compatibility |
| `NEXTAUTH_URL` | Yes in production | No | Authentication callback base URL |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | No | Canonical public web origin |
| `RATE_LIMIT_SECRET` | Yes | Yes | HMAC key for privacy-safe rate-limit identifiers |
| `REDIS_ENABLED` | No | No | Enables Redis-backed distributed rate limits when exactly `true` |
| `REDIS_URL` | When Redis is enabled | Yes | Server-only Redis connection URL; use TLS in production |
| `REDIS_KEY_PREFIX` | When Redis is enabled | No | Environment-specific namespace for Redis keys |
| `MOBILE_TOKEN_ISSUER` | Before mobile API rollout | No | Expected mobile access-token issuer |
| `MOBILE_TOKEN_AUDIENCE` | Before mobile API rollout | No | Expected mobile API audience |
| `MOBILE_ACCESS_TOKEN_KEY_ID` | Before mobile API rollout | No | Active signing-key identifier written into access-token headers |
| `MOBILE_ACCESS_TOKEN_PRIVATE_KEY` | Before mobile API rollout | Yes | Signs short-lived mobile access tokens |
| `MOBILE_ACCESS_TOKEN_PUBLIC_KEYS` | Before mobile API rollout | No | Key-ID map used to verify access tokens during rotation |
| `MOBILE_REFRESH_TOKEN_PEPPER` | Before mobile API rollout | Yes | Independent keyed hash input for opaque refresh tokens |
| `MOBILE_ALLOW_AUTH_PREVIEWS` | Local/test only | No | Explicitly permits local verification-code previews; ignored in production |
| `EXPO_ACCESS_TOKEN` | When authenticated Expo push is enabled | Yes | Server-to-Expo push authentication |
| `GOOGLE_CLIENT_ID` | For Google sign-in | Usually no | Google OAuth identification |
| `GOOGLE_CLIENT_SECRET` | For Google sign-in | Yes | Google OAuth server exchange |
| `SMTP_HOST` | For production email verification | No | SMTP server hostname |
| `SMTP_PORT` | For production email verification | No | SMTP server port |
| `SMTP_SECURE` | For production email verification | No | Direct TLS configuration |
| `SMTP_USER` | For production email verification | Sensitive | SMTP account name/email |
| `SMTP_PASS` | For production email verification | Yes | SMTP app password |
| `EMAIL_FROM` | For production email verification | No | Sender shown to recipients |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | For maps | Public by design | Browser-side Google Maps SDK |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | No | No | Optional Google map style ID |
| `GOOGLE_PLACES_API_KEY` | For address search | Yes | Server-side Places requests |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | For images | Public by design | Cloudinary account identifier |
| `CLOUDINARY_API_KEY` | For server upload route | Sensitive | Cloudinary API identification |
| `CLOUDINARY_API_SECRET` | For server upload route | Yes | Cloudinary signed operations |
| `CRON_SECRET` | For scheduled notifications | Yes | Protects the cron endpoint |
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
[`MOBILE_FOUNDATION_CHECKLIST.md`](MOBILE_FOUNDATION_CHECKLIST.md).

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

## 4. NextAuth and Google sign-in

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

## 8. Redis distributed rate limiting

Redis-backed rate limiting is optional and disabled by default. When it is
disabled, or when Redis is temporarily unavailable, Redrive uses the existing
MongoDB rate-limit buckets. This makes rollout reversible without weakening the
existing protection.

Provision a separate managed Redis resource for Preview and Production. Keep it
in a region close to both the Vercel functions and MongoDB, require encryption
in transit, and copy the provider's complete TLS connection string into the
server-only `REDIS_URL` variable:

```dotenv
REDIS_ENABLED="true"
REDIS_URL="rediss://default:provider-password@provider-host:6379"
REDIS_KEY_PREFIX="redrive:preview"
```

Use `redrive:production` for Production. The prefix is defence in depth and
does not replace separate resources or credentials. Never put these values in
EAS or an `EXPO_PUBLIC_`/`NEXT_PUBLIC_` variable. Redis keys contain HMACed
identifiers rather than raw IP addresses or emails.

Deploy first with `REDIS_ENABLED=false`, confirm the variables are scoped to the
correct environment, then enable Preview and test successful and rejected login
attempts. Check logs for `Redis rate limiting unavailable`; that message means
the MongoDB fallback was used. See [`redis.md`](redis.md) for the architecture,
outage policy, and later phases.

## 9. Scheduled notification secret

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

The schedule in `vercel.json` calls `/api/cron/notifications`. Vercel sends `Authorization: Bearer <CRON_SECRET>` when this specially named variable exists, and the route rejects requests without an exact match.

The current schedule is:

```text
0 9 * * *
```

Vercel cron expressions use UTC, so this means 09:00 UTC every day. Adelaide's local time varies with daylight saving; it is not always the same UTC offset.

Official reference: [Vercel cron job security](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).

## 10. Add variables to Vercel using the dashboard

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
| Cloudinary | Optional via CLI | Yes if testing uploads | Yes |
| Redis rate limiting | Disabled or local Redis | Separate Preview resource | Separate Production resource |
| Cron secret | Optional | Yes | Yes |
| Mobile issuer/audience | Local `.env.local` | Stable Preview API identity | Canonical Production API identity |
| Mobile signing key ID/private/public map | Development-only pair | Independent Preview pair | Independent Production pair |
| Mobile refresh-token pepper | Development-only secret | Independent Preview secret | Independent Production secret |
| Expo push access token | When testing secured push | Separate Preview token | Separate Production token |

Use separate Preview and Production databases where practical. Preview deployments can execute mutations, registrations and uploads; pointing every branch at the production database risks contaminating real data.

Use independent secrets for Preview and Production. `NEXTAUTH_SECRET`,
`SMTP_PASS`, `CLOUDINARY_API_SECRET`, `DATABASE_URL`, `CRON_SECRET`,
`REDIS_URL`,
`MOBILE_ACCESS_TOKEN_PRIVATE_KEY`, `MOBILE_REFRESH_TOKEN_PEPPER`, and
`EXPO_ACCESS_TOKEN` should be marked sensitive when the Vercel UI offers that
option. The mobile public-key map is not secret, but it remains server
configuration and should not be copied into the native application.

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

## 11. Add variables using the Vercel CLI

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

## 12. Apply the database schema before production use

The package build generates Prisma Client but intentionally does not run `prisma db push`. Apply schema changes explicitly from a trusted local machine.

If `.env.local` points to the intended database:

```powershell
npx prisma db push
```

If you need the Production value from Vercel without manually copying it, pull into a temporary ignored environment file and review the target carefully before running a schema command. Never run `db push` against production until you have confirmed the database URL identifies the intended cluster and database.

For the current update, `db push` also creates the mobile session, authentication
challenge, push-token, and idempotency collections/indexes defined in
`prisma/schema.prisma`. Apply and verify these changes in Preview before
Production.

## 13. Recommended setup order

1. Create MongoDB Atlas and set `DATABASE_URL`.
2. Generate `NEXTAUTH_SECRET` and `CRON_SECRET` separately.
3. Configure Google OAuth and set `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
4. Configure Gmail app password or another SMTP provider.
5. Enable Google Maps/Places, create two restricted keys, and optionally create a map ID.
6. Configure the three Cloudinary environment variables; no upload preset is needed.
7. Provision isolated Preview and Production Redis resources, deploy with
   `REDIS_ENABLED=false`, and validate connectivity in Preview before enabling it.
8. Generate separate mobile RSA key pairs and refresh-token peppers for
   Development, Preview, and Production.
9. Initialize the organization-owned EAS project from `apps/mobile`, then
   record its project ID.
10. Configure the server-side mobile values in matching Vercel environments and
   the public mobile values in matching EAS environments.
11. Run `npx prisma db push` against the intended Preview database after a
    backup and target check; validate it before Production.
12. Deploy or redeploy the backend.
13. Create a signed Preview build and confirm it uses only Preview providers.
14. Complete the verification checklist below.

## 14. Post-deployment checklist

- [ ] The homepage and listing data load without a Prisma connection error.
- [ ] A new email/password account receives a six-digit email.
- [ ] A wrong verification code is rejected.
- [ ] The correct code verifies the account and allows login.
- [ ] **Continue with Google** completes without `redirect_uri_mismatch`.
- [ ] Maps render on a listing.
- [ ] Address autocomplete returns Australian results.
- [ ] A listing image uploads successfully.
- [ ] Vercel shows `/api/cron/notifications` under Cron Jobs.
- [ ] The cron's latest execution returns HTTP 200 rather than 401 or 500.
- [ ] Preview deployments do not write test data into the production database unless that was an intentional decision.
- [ ] Preview and Production have isolated Redis resources, TLS URLs, and key prefixes.
- [ ] Redis rate limits reject above-limit requests and expose `Retry-After`.
- [ ] A controlled Redis connection failure uses MongoDB rate-limit buckets.
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

## 15. Troubleshooting

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
| Cloudinary widget rejects uploads | Confirm cloud name and the exact unsigned preset name `redrive`; inspect preset file limits/formats. |
| Cron returns 401 | Confirm `CRON_SECRET` exists in that Vercel environment and redeploy. Do not add `Bearer ` to the stored value. |
| Redis falls back to MongoDB | Confirm `REDIS_ENABLED=true`, the TLS `REDIS_URL`, provider network access, credentials, and environment scope. Redeploy after changes. |
| A variable remains `undefined` | Confirm its Vercel environment scope and redeploy. For local work, restart `npm run dev` after changing `.env.local`. |
| Mobile API returns `MOBILE_AUTH_UNAVAILABLE` | Confirm the issuer, audience, active key ID, complete PKCS#8 private PEM, valid public-key JSON map, matching public key, and refresh-token pepper exist in that Vercel environment. |
| Mobile API returns `UNAUTHENTICATED` immediately after login | Check that the signing and verification key pair match and that the deployment has not mixed Preview and Production issuer/audience values. |
| Android emulator cannot reach `localhost` | Use `http://10.0.2.2:3000` as `EXPO_PUBLIC_API_ORIGIN`; `localhost` points to the emulator itself. |
| Physical phone cannot reach the local API | Use the development computer's private LAN address, allow the port through the local firewall, and keep both devices on the same trusted network. |
| Preview build uses the wrong app identity or backend | Confirm the EAS build profile uses `environment: preview`, inspect `eas env:list --environment preview`, then rebuild. Public values are embedded at bundle time. |
| An EAS Update has wrong or missing public values | Re-run the update with the explicit matching `--environment`; SDK 55 and later require it. |
| Universal/App Link opens the website instead of the app | Confirm `EXPO_PUBLIC_LINK_HOST`, rebuild the signed binary, publish the correct Apple/Android association files, and verify they include that exact signed app identity. |
| Expo push requests return `UNAUTHORIZED` | If enhanced push security is enabled, confirm the backend's `EXPO_ACCESS_TOKEN` is active and its Expo user/robot has access to the owning project. EAS environment names do not scope the token automatically. Never move it into the app bundle. |

## 16. Rotation and incident response

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
| `CLOUDINARY_API_SECRET` | Signed/server uploads fail until updated. |
| `CRON_SECRET` | Cron calls receive 401 until updated. |
