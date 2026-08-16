# REDRIVE — Deployment Guide

This walks through every external service REDRIVE depends on, how to get each API key, and how to put the app live on Vercel. Follow it top to bottom on a fresh deployment; skip to a section if you're only rotating one key.

Reference: `.env.example` lists every variable with a one-line description. This doc explains *where to get each value* and *how the pieces fit together*.


---

## 0. What you'll need accounts for

| Service | Used for | Free tier OK? |
|---|---|---|
| [Vercel](https://vercel.com) | Hosting, cron, analytics | Yes |
| [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | Primary database | Yes (M0 cluster) |
| [Google Cloud Console](https://console.cloud.google.com) | "Sign in with Google", Maps, Places | Yes (Maps/Places have a monthly free credit) |
| [Cloudinary](https://cloudinary.com) | Image hosting/upload for listings | Yes |

---

## 1. MongoDB Atlas (`DATABASE_URL`)

1. Create a free cluster at Atlas (M0 tier is fine to start).
2. **Database Access** → add a database user with a strong password (this is *not* your Atlas login).
3. **Network Access** → add an IP allowlist entry. Since Vercel's serverless functions don't have static IPs, add `0.0.0.0/0` (allow from anywhere) — MongoDB Atlas still requires the correct username/password/TLS, so this is standard practice for serverless deployments, not a security hole by itself.
4. **Database** → **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
5. Add a database name before the `?` (Prisma needs an explicit db name), e.g.:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/redrive?retryWrites=true&w=majority
   ```
6. This full string is your `DATABASE_URL`.
7. **Push the Prisma schema to create required indexes.** MongoDB has no `prisma migrate` — instead, after `DATABASE_URL` is set (locally, pointed at the real cluster, or via `vercel env pull`), run:
   ```bash
   npx prisma db push
   ```
   This creates the unique indexes the schema depends on (`User.email`, `Listing.regoNumber`, `Account.[provider,providerAccountId]`, `Review.[userId,listingId]`, `Badge.key`) and the notification indexes. **Do this once before first deploy, and again any time `prisma/schema.prisma` changes.** Skipping it doesn't break the build, but duplicate-prevention (e.g. two users with the same email) won't be enforced at the database level.

---

## 2. NextAuth + Google Sign-In (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

### NextAuth secret
Generate a random 32+ character secret:
```bash
openssl rand -base64 32
```
Set as `NEXTAUTH_SECRET`. This signs session JWTs — treat it like a password, never commit it.

### `NEXTAUTH_URL`
Set to your production URL once you know it, e.g. `https://redrive.vercel.app` or your custom domain. In local dev, use `http://localhost:3000`.

### Google OAuth client
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and create (or select) a project.
2. **OAuth consent screen** → configure it (External user type is fine for a public app; fill in app name, support email, and add your domain once you have one).
3. **Credentials** → **Create Credentials** → **OAuth client ID** → Application type: **Web application**.
4. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/google        (for local dev)
   https://<your-production-domain>/api/auth/callback/google
   ```
   NextAuth's Google provider expects exactly this path (`/api/auth/callback/google`) — get this wrong and login will fail with a `redirect_uri_mismatch` error.
5. Copy the generated **Client ID** → `GOOGLE_CLIENT_ID`, and **Client Secret** → `GOOGLE_CLIENT_SECRET`.

> Note: email/password login (via the Credentials provider) doesn't need any of this — only "Sign in with Google" does. If you don't need Google login yet, you can leave these blank and email/password auth will still work; the Google button will just error if clicked.

---

## 3. Google Maps & Places (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `GOOGLE_PLACES_API_KEY`)

1. In the same Google Cloud project, go to **APIs & Services** → **Library** and enable:
   - **Maps JavaScript API**
   - **Places API**
2. **APIs & Services** → **Credentials** → **Create Credentials** → **API key**. You can use one key for both, or split them (recommended for tighter restriction):
   - **Maps key** (client-exposed, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`): restrict it under **Application restrictions** → **HTTP referrers**, and list your domain(s), e.g. `https://your-domain.com/*`, `http://localhost:3000/*`. Under **API restrictions**, limit it to "Maps JavaScript API".
   - **Places key** (server-only, `GOOGLE_PLACES_API_KEY`): restrict under **Application restrictions** → none needed since it's never sent to the browser, but you can restrict by IP if your host has a static egress IP. Under **API restrictions**, limit it to "Places API".
3. `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` is optional — only needed if you've created a custom styled map under **Google Maps Platform** → **Map Management**. Leave blank to use the default style.

Since `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is bundled into client-side JS by design, the HTTP-referrer restriction above is what actually protects it from abuse — don't skip that step.

### Address autocomplete — nothing extra to set up

Every "Number & Street Address" field in the app (Add Listing's location step, Edit Listing, and Profile) is a live Google Places autocomplete: type 3+ characters (e.g. "3 Pen...") and it shows matching Australia-wide addresses as you type, restricted to `country:au`; picking one auto-fills the street address plus the State and Suburb/Postcode dropdowns next to it in one go.

This runs entirely on the **same `GOOGLE_PLACES_API_KEY`** from step 2 above — if that key is set and the **Places API** is enabled on it, address autocomplete just works with no further configuration. It's powered by two server-only routes that keep the key off the client:

- `GET /api/places?input=<text>&sessiontoken=<uuid>` — Places Autocomplete, returns up to 5 matches.
- `GET /api/places/details?placeId=<id>&sessiontoken=<uuid>` — Place Details, called once a suggestion is picked; parses the result into street address / suburb / state / postcode / lat / lng.

Both requests share a `sessiontoken` (a random UUID generated in the browser per autocomplete "session", reset after each selection) — this is Google's recommended pattern to bill an entire type-then-select flow as one cheaper Autocomplete session instead of one paid request per keystroke. Nothing to configure for this either; it's built into the frontend component (`app/components/inputs/AddressAutocomplete.tsx`).

If you ever see suggestions fail silently, check the server logs for `Google Places autocomplete error` / `Google Places details error` — that's this same key surfacing a Google-side error (see troubleshooting table below).

---

## 4. Cloudinary (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)

1. Sign up at [cloudinary.com](https://cloudinary.com) and open the **Dashboard**.
2. Copy **Cloud name** → `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, **API Key** → `CLOUDINARY_API_KEY`, **API Secret** → `CLOUDINARY_API_SECRET`.
   - `CLOUDINARY_API_SECRET` is server-only — it's used by `app/api/upload/route.ts` and must never be prefixed with `NEXT_PUBLIC_`.
3. **Create the unsigned upload preset the app expects.** The listing image widget (`app/components/inputs/ImageUpload.tsx`) uploads directly from the browser using `next-cloudinary`'s widget with a hardcoded preset name: **`redrive`**. You must create a preset with exactly this name:
   - Cloudinary Dashboard → **Settings** (gear icon) → **Upload** → **Upload presets** → **Add upload preset**.
   - Set **Preset name** to `redrive`.
   - Set **Signing Mode** to **Unsigned** (required — the widget uploads directly from the client without your API secret).
   - Optionally set a folder (e.g. `listings`) and file size/type restrictions.
   - Save.
   - If you skip this, the "Add your items" listing image upload will silently fail in the browser widget.
4. `res.cloudinary.com` is already allowlisted for Next.js image optimization in `next.config.js` — no changes needed there.

---

## 5. Cron secret (`CRON_SECRET`)

The app has one scheduled job — `app/api/cron/notifications/route.ts` — which sends booking reminders and review reminders, and cleans up expired notifications. It's wired to run daily via Vercel Cron (`vercel.json`, currently `0 9 * * *` = 9am UTC daily — edit the cron expression there if you want a different time).

1. Generate a secret the same way as `NEXTAUTH_SECRET`: `openssl rand -base64 32`.
2. Set it as `CRON_SECRET` in your environment variables (both locally and in Vercel).
3. **No further action needed on Vercel's side** — once `CRON_SECRET` is set as a project environment variable, Vercel Cron automatically sends it as `Authorization: Bearer <CRON_SECRET>` when it calls the scheduled path, and the route checks for that exact header before running.
4. If `CRON_SECRET` is unset, the endpoint returns `401 Unauthorized` for every request — including Vercel's own cron calls — as a fail-safe (better a broken cron than an unauthenticated one anyone can trigger).

---

## 6. Full environment variable reference

Set all of these in **Vercel → Project → Settings → Environment Variables** (apply to Production, and Preview if you want preview deployments to work fully). See `.env.example` for the same list with inline comments.

| Variable | Source | Scope |
|---|---|---|
| `DATABASE_URL` | MongoDB Atlas connection string | Server |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Server |
| `NEXTAUTH_URL` | Your deployed URL | Server |
| `GOOGLE_CLIENT_ID` | Google Cloud Console OAuth client | Server |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console OAuth client | Server |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console API key | Client |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Google Maps Platform Map Management (optional) | Client |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console API key | Server |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard | Client |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard | Server |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard | Server |
| `CRON_SECRET` | `openssl rand -base64 32` | Server |

Never commit real values — `.env` is gitignored (except `.env.example`, which intentionally has no real secrets).

---

## 7. Deploying to Vercel

1. Push the repo to GitHub (or GitLab/Bitbucket).
2. [vercel.com/new](https://vercel.com/new) → import the repository.
3. Vercel auto-detects Next.js. Leave the framework preset as-is.
4. Build command: leave as default — it picks up `package.json`'s `"build": "prisma generate && next build"` automatically, which regenerates the Prisma Client on every deploy.
5. Add every environment variable from the table above under **Environment Variables** before the first deploy (the build will fail without `DATABASE_URL` at minimum, since Prisma validates it at build/runtime).
6. Deploy.
7. Once you have your real production URL, go back and update `NEXTAUTH_URL` (and the Google OAuth redirect URI, if the domain changed) to match, then redeploy.
8. If you haven't already, run `npx prisma db push` once locally against the production `DATABASE_URL` (see §1) — this isn't part of the Vercel build step by design, so it must be run manually after any schema change.

### Custom domain
Vercel → Project → **Settings** → **Domains** → add your domain, follow the DNS instructions. HTTPS is automatic. Remember to update `NEXTAUTH_URL` and the Google OAuth redirect URI to the custom domain too.

---

## 8. Post-deploy verification checklist

Run through this after every deploy that touches env vars or auth:

- [ ] Homepage loads and shows listings (confirms `DATABASE_URL` is correct and `prisma db push` ran).
- [ ] Register a new account with email/password, then log out and log back in (confirms `NEXTAUTH_SECRET`/Credentials provider).
- [ ] Click "Sign in with Google" and complete the flow (confirms `GOOGLE_CLIENT_ID`/`SECRET` and the redirect URI match).
- [ ] Open a listing detail page and confirm the map renders (confirms `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and its HTTP-referrer restriction allow your domain).
- [ ] Start "Add your items" and upload an image (confirms `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and the `redrive` unsigned preset exist).
- [ ] In "Add your items" → Location step (or Profile → Address Line), type 3+ characters of a real AU street address (e.g. "3 Pen...") and confirm a suggestions dropdown appears; pick one and confirm the address, State, and Suburb/Postcode fields all auto-fill (confirms `GOOGLE_PLACES_API_KEY` and that "Places API" is enabled on it).
- [ ] Check **Vercel → Project → Cron Jobs** shows the `/api/cron/notifications` job and that its most recent run returned `200` (confirms `CRON_SECRET` matches).

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Build fails with a Prisma "nonempty URL" error | `DATABASE_URL` isn't set in Vercel's environment variables for that environment (Production/Preview). |
| Google login redirects to an error page | Redirect URI in Google Cloud Console doesn't exactly match `<NEXTAUTH_URL>/api/auth/callback/google`, or `NEXTAUTH_URL` is stale after a domain change. |
| Map doesn't render / console shows `RefererNotAllowedMapError` | The Maps API key's HTTP-referrer restriction doesn't include the current domain. |
| Image upload widget does nothing on click, or errors silently | The `redrive` unsigned upload preset doesn't exist yet, or is set to "Signed" instead of "Unsigned". |
| Cron job shows `401` in Vercel's Cron Jobs log | `CRON_SECRET` isn't set (or doesn't match) in the deployed environment. |
| Two users can register with the same email, or duplicate rego numbers get accepted | `npx prisma db push` was never run against this database — the unique indexes don't exist yet. |
| Address autocomplete shows no dropdown, or server logs show `Google Places autocomplete error` | `GOOGLE_PLACES_API_KEY` is missing/invalid, "Places API" isn't enabled on that key's project, or billing isn't enabled on the Google Cloud project (Places API requires a billing account even within the free monthly credit). |
| Picking an address suggestion fills the street address but not State/Suburb | Google's returned locality name doesn't match an entry in the app's static suburb list (`app/libs/SuburbDataLoader.ts`) closely enough — the State always fills since it's just the AU state code; re-pick the suburb manually from the dropdown in that case. |

---

## 10. Real-time chat feature — how to run it

The messaging system (`app/messages/*`, `app/api/chats/*`) was rebuilt to be real-time: live message delivery, typing indicators, read receipts, and online/last-seen presence. **No new environment variables or third-party accounts are needed** — it's built entirely on Server-Sent Events (SSE) backed by MongoDB, streamed through your existing Next.js API routes.

### One-time setup step

The rebuild added a few fields to the schema (`Chat.updatedAt`/`typingUserId`/`typingAt`, `User.lastActiveAt`, plus two indexes). If you're pulling this update onto a database that predates it, push the schema once:

```bash
npx prisma db push
```

(This is the same command from §1 — nothing new to learn, just run it again after this update.)

### How it works, operationally

- **Live delivery**: `GET /api/chats/[chatId]/stream` and `GET /api/chats/stream` are SSE endpoints. Each browser tab holds one open connection per view (one for whichever conversation is open, one for the inbox list). The server polls MongoDB every ~1 second and pushes anything new down the open connection — no external pub/sub, no WebSocket infrastructure to run or scale separately.
- **Self-healing connections**: each stream intentionally closes itself after ~45 seconds. The browser's native `EventSource` reconnects automatically and resumes exactly where it left off via the standard `Last-Event-ID` mechanism — so a dropped connection, a deploy, or a serverless cold start never loses a message; it just reconnects within a second or two. There's nothing to configure or monitor for this — it's self-recovering by design.
- **Presence**: `app/hooks/usePresence.ts` pings `POST /api/presence` every ~25s while the app is open (any page, not just an open chat), so "Online"/"Last seen" is accurate app-wide.
- **Vercel function duration**: each stream request runs for ~45 seconds max before self-closing (see above), well under Vercel's default serverless function timeout on every plan tier — no `maxDuration` configuration needed.

### Verifying it after deploy

1. Log in as two different users in two browser windows (or one normal + one incognito) with an existing chat between them (start one via "Message" on a reservation's detail page).
2. Open the same conversation in both windows. Type in one — a "typing…" indicator should appear in the other within ~1-2 seconds.
3. Send a message — it should appear in the other window within ~1-2 seconds with no manual refresh.
4. With the second window's conversation open (i.e., visible/focused), the first user's sent message should flip from a single to a double checkmark shortly after — confirming the read receipt.
5. Go to `/messages` (the inbox) in the first window without the conversation open — sending a new message from the second window should bump that conversation to the top of the inbox with an unread badge, live, without refreshing.
6. Open browser devtools → Network tab, find the `stream` request, and confirm it's type `eventsource`/`text/event-stream` and reconnects every ~45s rather than erroring out.

If a message doesn't arrive live but appears after a manual page refresh, check the browser console for a blocked/failed request to `/api/chats/.../stream` — the most common cause is a reverse proxy or CDN in front of the app buffering SSE responses; Vercel doesn't need any special configuration for this, but a custom proxy in front of Vercel might.

---

## 11. Candidate application colour schemes

Coast and Country is the active application palette. The remaining schemes are retained as future alternatives. Each palette keeps a light marketplace interface and provides a primary action colour, hover colour, dark text, soft surface and subtle border.

| Option | Direction | Primary | Primary hover | Ink | Soft surface | Border |
|---|---|---:|---:|---:|---:|---:|
| Coastal Drive | Calm, trustworthy and distinctly Australian | `#087E8B` | `#066A75` | `#16323A` | `#F1F8F8` | `#D7E7E8` |
| Outback Ember | Warm, adventurous and memorable | `#D65A31` | `#B94824` | `#2B211D` | `#FFF6F1` | `#F0DDD3` |
| Eucalyptus | Natural, practical and sustainability-led | `#2F7D65` | `#256650` | `#20332D` | `#F2F7F4` | `#D9E6DF` |
| Electric Indigo | Modern, energetic and technology-forward | `#4F46E5` | `#4338CA` | `#20213A` | `#F4F4FF` | `#DEDEFA` |
| Sunset Coral | Friendly and travel-focused while retaining the current warmth | `#E34F67` | `#C93D54` | `#2D2326` | `#FFF4F6` | `#F1DCE1` |
| Harbour Navy | Established, secure and premium without feeling corporate | `#24527A` | `#1B4162` | `#182A3A` | `#F3F7FA` | `#D9E4EC` |
| Tasman Blue | Fresh, open and inspired by clear southern water | `#256A8A` | `#1D5671` | `#183440` | `#F2F8FA` | `#D6E7EC` |
| Jacaranda Road | Distinctive, creative and slightly more premium | `#6B4FA3` | `#563E86` | `#302A3D` | `#F7F4FB` | `#E5DDF0` |
| Banksia Gold | Grounded, confident and recognisably Australian | `#946018` | `#754B12` | `#382E20` | `#FBF7EF` | `#EDE1CC` |
| Dusty Rose | Welcoming, lifestyle-led and softer than a conventional rental brand | `#A3445A` | `#843548` | `#38282C` | `#FCF5F7` | `#ECDCE1` |
| Alpine Slate | Quiet, professional and suited to a broad vehicle marketplace | `#47657A` | `#374F60` | `#202F38` | `#F4F7F9` | `#DCE5EA` |
| Rainforest | Strong, dependable and outdoors-focused | `#28664D` | `#1E503C` | `#21342C` | `#F2F7F4` | `#D7E5DD` |
| Pacific Cyan | Bright, modern and energetic while remaining trustworthy | `#087A9A` | `#06627C` | `#15333C` | `#F0F8FA` | `#D3E7EC` |
| Highway Plum | Bold and memorable with a refined urban character | `#70405F` | `#59334C` | `#352A32` | `#FAF5F8` | `#E9DCE4` |
| Limestone | Warm-neutral and minimal, with a restrained premium accent | `#796247` | `#604D38` | `#332E28` | `#F8F6F2` | `#E6E0D7` |

### Bright alternatives

These options use stronger, more energetic accents and lightly tinted surfaces. Their primary colours remain dark enough to support readable white labels on buttons and active controls.

| Option | Direction | Primary | Primary hover | Ink | Soft surface | Border |
|---|---|---:|---:|---:|---:|---:|
| Sunlit Azure | Crisp, optimistic and highly visible across mobile screens | `#006EE6` | `#0057B8` | `#142E48` | `#F0F7FF` | `#CCE3FA` |
| Tropical Turquoise | Bright, fresh and suited to coastal adventures | `#007F73` | `#00665C` | `#123B38` | `#EEFBF9` | `#C8ECE7` |
| Roadtrip Orange | Energetic, adventurous and action-oriented | `#C94B00` | `#A63E00` | `#3D271B` | `#FFF5EC` | `#F4D9C4` |
| Festival Magenta | Expressive, social and memorable without feeling childish | `#C0266D` | `#9F1E5A` | `#402333` | `#FFF1F7` | `#F3D1E1` |
| Ultraviolet | Bold, digital-first and distinctive in a crowded marketplace | `#6D3CEB` | `#5730C0` | `#2D2542` | `#F6F2FF` | `#E1D7FA` |
| Surf Blue | Clear, active and strongly associated with travel and water | `#0077B6` | `#005F91` | `#173543` | `#EFF9FE` | `#CDE8F5` |
| Adventure Green | Lively, outdoors-focused and more energetic than Eucalyptus | `#318239` | `#28692F` | `#203624` | `#F1FAF2` | `#D1E9D4` |
| Signal Cherry | Confident, friendly and designed for strong calls to action | `#C9344A` | `#A9293D` | `#40252A` | `#FFF2F4` | `#F2D3D8` |

### Australian-inspired alternatives

These palettes draw from Australian coastlines, native flora and familiar road-trip landscapes. The names are thematic references only; the colours are tuned for accessible digital interfaces rather than literal landscape reproductions.

| Option | Direction | Primary | Primary hover | Ink | Soft surface | Border |
|---|---|---:|---:|---:|---:|---:|
| Great Barrier Reef | Clear tropical water, coral detail and bright Queensland travel | `#007C91` | `#006274` | `#14373D` | `#EFFAFA` | `#C9E9E9` |
| Uluru Sunset | Deep desert orange balanced by warm stone neutrals | `#B94E1F` | `#963E18` | `#3B2921` | `#FFF4ED` | `#EFD5C6` |
| Wattle and Gum | Golden native bloom paired with calm eucalyptus undertones | `#806000` | `#664D00` | `#343125` | `#FFF9E8` | `#EBE0BB` |
| Bondi Daybreak | Clean ocean blue with a bright, relaxed coastal surface | `#0878A4` | `#066184` | `#183743` | `#EFF9FD` | `#CBE6F0` |
| Kakadu Wetlands | Rich wetland green with soft mineral-grey supporting tones | `#356B4F` | `#29543E` | `#26372F` | `#F1F7F3` | `#D5E5DA` |
| Blue Mountains | Atmospheric blue-grey with a quiet premium character | `#4B607C` | `#3B4C63` | `#252F3D` | `#F3F6FA` | `#D9E1EB` |
| Nullarbor Sky | Expansive cobalt sky against pale limestone surfaces | `#285EAD` | `#204B8A` | `#202F45` | `#F2F6FC` | `#D5E1F1` |
| Sydney Harbour | Confident harbour blue for a polished urban marketplace | `#176B87` | `#12566D` | `#18323C` | `#F0F8FA` | `#D0E5EB` |
| Flinders Ranges | Rugged ochre and muted earth tones for an adventurous identity | `#985122` | `#793F1A` | `#392D25` | `#FAF4EF` | `#E8D8CC` |
| Daintree Canopy | Dense rainforest green with fresh, cool supporting surfaces | `#246348` | `#1B4E38` | `#20342B` | `#F0F7F3` | `#D1E3D8` |
| Southern Cross | Deep night-sky indigo with crisp pale-blue surfaces | `#3E4E9A` | `#313E7B` | `#252B46` | `#F3F5FC` | `#D9DEF1` |
| Pink Lake | Distinctive rose inspired by Australia’s salt lakes | `#A33F68` | `#823253` | `#3B2932` | `#FCF3F7` | `#EBD6DF` |

### Mixed Australian palettes

These palettes deliberately mix several recognisable Australian colour families. Use **Primary** for main buttons and links, **Secondary** for selected filters, badges and supporting controls, and **Accent** sparingly for highlights, illustrations, status chips or promotional elements. Keeping one colour responsible for primary actions prevents a multi-colour interface from becoming visually confusing.

| Option | Inspiration | Primary | Secondary | Accent | Ink | Soft surface | Border |
|---|---|---:|---:|---:|---:|---:|---:|
| **Coast and Country (active)** | Ocean teal, eucalyptus bushland and golden wattle | `#087985` | `#39715A` | `#D39A12` | `#18363A` | `#F1F8F5` | `#D2E6E0` |
| Reef and Coral | Tropical water, coral formations and warm island sand | `#007D91` | `#C95043` | `#D9A83A` | `#17363D` | `#F0FAFA` | `#CBE8E7` |
| Desert Bloom | Red earth, pink wildflowers and clear inland sky | `#A94A25` | `#A43C68` | `#28789C` | `#3C2928` | `#FCF4F1` | `#E9D5CF` |
| Bush and Wattle | Gum leaves, wattle flowers and terracotta tracks | `#326C54` | `#936B00` | `#B85532` | `#29352E` | `#F4F8F3` | `#D8E4D8` |
| Harbour Lights | Deep harbour blue, bright water and city gold | `#175F7C` | `#1687A4` | `#C58917` | `#1B323C` | `#F1F8FA` | `#D2E6EC` |
| Rainforest and Reef | Daintree green, tropical turquoise and sunlight | `#286348` | `#007F89` | `#C4920E` | `#21372E` | `#F0F8F4` | `#D0E4D8` |
| Outback Night | Southern sky, red ranges and campfire gold | `#47518F` | `#A34827` | `#BD8118` | `#2D2D42` | `#F6F4F7` | `#DFDAE6` |
| Salt Lake Coast | Pink salt lakes, coastal blue and pale mineral tones | `#9C4168` | `#176B88` | `#C57A42` | `#382C35` | `#FBF3F7` | `#E8D6DF` |
| Surf and Sand | Pacific blue, sea-glass green and warm beach coral | `#08749B` | `#218173` | `#C95A43` | `#19363E` | `#F3F9F7` | `#D3E7E2` |
| Wattle Sunrise | Morning-sky blue, rich wattle and soft sunrise orange | `#286A9A` | `#8A6500` | `#C86435` | `#26343D` | `#F7F8F2` | `#E3E4D2` |

#### Suggested mixed-palette usage

- Keep approximately 70% of the interface neutral using the ink, white and soft-surface colours.
- Use the primary colour for all main calls to action so users always know where to proceed.
- Use the secondary colour for navigation selection, category filters and informational badges.
- Reserve the accent colour for small moments of emphasis; avoid using it for long text or every card.
- Keep success, warning and error colours semantic rather than replacing them with palette accents.

### Current selection

**Coast and Country** is applied across the app’s actions, navigation accents, typography, borders, surfaces, loading states, date controls, logo, favicon, map accents and transactional emails. Ocean teal anchors primary actions, eucalyptus green supports selections and location details, and wattle gold is reserved for small highlights. This keeps the interface consistent while giving Redrive a recognisably Australian identity.

Before adopting a palette, test normal text, muted text, buttons, focus rings and error states against WCAG AA contrast targets. Keep semantic colours such as success, warning and error separate from the brand primary colour.
