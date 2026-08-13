# Redrive Environment Variables and Vercel Setup

This guide explains every value in `.env.example`, where to obtain it, how to configure it locally, and how to add it to Vercel.

> Never paste real secrets into `.env.example`, this document, source code, Git commits, screenshots, or support messages. Put local secrets in `.env.local` or `.env`. Both are ignored by Git in this project.

## 1. What the completed local file looks like

Create `.env.local` in the project root. You may use `.env` instead, but `.env.local` is the conventional choice for machine-specific Next.js secrets.

```dotenv
DATABASE_URL="mongodb+srv://redrive_app:URL_ENCODED_PASSWORD@cluster0.example.mongodb.net/redrive?retryWrites=true&w=majority"

NEXTAUTH_SECRET="a-long-random-secret-generated-for-this-project"
NEXTAUTH_URL="http://localhost:3000"
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
```

The strings above are examples only. Do not copy them as working credentials.

## 2. Quick reference

| Variable | Required? | Secret? | Used where |
|---|---:|---:|---|
| `DATABASE_URL` | Yes | Yes | Prisma/MongoDB server connection |
| `NEXTAUTH_SECRET` | Yes | Yes | NextAuth sessions and API JWTs |
| `NEXTAUTH_URL` | Yes in production | No | Authentication callback base URL |
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

Anything beginning with `NEXT_PUBLIC_` is included in browser JavaScript. It must not contain a private secret. Browser API keys still need provider-side restrictions.

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

## 8. Scheduled notification secret

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

## 9. Add variables to Vercel using the dashboard

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
| Cron secret | Optional | Yes | Yes |

Use separate Preview and Production databases where practical. Preview deployments can execute mutations, registrations and uploads; pointing every branch at the production database risks contaminating real data.

Use independent secrets for Preview and Production. `NEXTAUTH_SECRET`, `SMTP_PASS`, `CLOUDINARY_API_SECRET`, `DATABASE_URL` and `CRON_SECRET` should be marked sensitive when the Vercel UI offers that option.

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

## 10. Add variables using the Vercel CLI

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

## 11. Apply the database schema before production use

The package build generates Prisma Client but intentionally does not run `prisma db push`. Apply schema changes explicitly from a trusted local machine.

If `.env.local` points to the intended database:

```powershell
npx prisma db push
```

If you need the Production value from Vercel without manually copying it, pull into a temporary ignored environment file and review the target carefully before running a schema command. Never run `db push` against production until you have confirmed the database URL identifies the intended cluster and database.

For the current update, `db push` creates the email verification fields and indexes defined in `prisma/schema.prisma`.

## 12. Recommended setup order

1. Create MongoDB Atlas and set `DATABASE_URL`.
2. Generate `NEXTAUTH_SECRET` and `CRON_SECRET` separately.
3. Configure Google OAuth and set `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
4. Configure Gmail app password or another SMTP provider.
5. Enable Google Maps/Places, create two restricted keys, and optionally create a map ID.
6. Configure the three Cloudinary environment variables; no upload preset is needed.
7. Run `npx prisma db push` against the intended database.
8. Add all values to Vercel with correct environment scopes.
9. Deploy or redeploy.
10. Complete the verification checklist below.

## 13. Post-deployment checklist

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
- [ ] No real credential is present in Git history or `.env.example`.

## 14. Troubleshooting

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
| A variable remains `undefined` | Confirm its Vercel environment scope and redeploy. For local work, restart `npm run dev` after changing `.env.local`. |

## 15. Rotation and incident response

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
