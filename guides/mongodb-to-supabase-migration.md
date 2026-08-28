# MongoDB → Supabase (Postgres) Migration Guide

**Goal:** Move every document from the current MongoDB database into a Supabase
Postgres database and switch the app over permanently — **without changing the
application structure**. All data access already goes through Prisma
(`app/libs/prismadb.ts`), so once the schema provider and `DATABASE_URL` change,
every existing query, API route, and component keeps working unchanged.

---

## 0. Why this is low‑risk for this codebase

| Concern | Status in `redrive` |
| --- | --- |
| Raw `mongodb` driver calls in app code | **None** — only `new PrismaClient()` in `app/libs/prismadb.ts` |
| `$runCommandRaw` / `aggregateRaw` / `findRaw` | **None** in `app/**` or `pages/**` |
| Mongo‑only Prisma features (`isSet`, `@db.ObjectId` in queries) | Not used in query code; only in `schema.prisma` |
| Prisma Client API differences Mongo vs Postgres | **None** for the operations this app uses (`findMany`, `findUnique`, `create`, `update`, `upsert`, `createMany`, `count`, `delete`, array filters `has`/`hasEvery`, `Json` fields, relations) |
| Scalar list fields (`favoriteIds`, `imageSrcs`, `amenities`, …) | Supported natively on Postgres (`text[]`) |
| `Json?` fields (`quoteSnapshot`, `metadata`, `filters`, …) | Become `jsonb` — identical API |
| `Bytes` field (`WebAuthnCredential.publicKey`) | Becomes `bytea` — identical API |
| `enum NotificationType` | Becomes a native Postgres enum — identical values |

**What changes:** `prisma/schema.prisma` (datasource + id/attribute cleanup) and
env vars. Nothing else.

**What does NOT change:** `app/**`, `pages/**`, `middleware.ts`, `packages/**`,
`apps/mobile/**`, every `prisma.*` call, NextAuth config, all component code.

---

## 1. Prerequisites

Install locally (one‑time):

```bash
# MongoDB tools for the pre-migration backup
#   mongodump / mongoexport  (https://www.mongodb.com/try/download/database-tools)

# psql client (optional but handy for verification)
#   Windows: winget install PostgreSQL.PostgreSQL  (or just the client)

node -v   # must be >= 22.13.0 (see package.json "engines")
```

You will need:

- Current `DATABASE_URL` (the `mongodb+srv://…` string).
- A Supabase account.

---

## 2. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Pick a region **close to your Vercel deployment region** (check
   `vercel.json` / project settings — match it to minimise latency).
3. Set a strong database password and store it in your password manager.
4. Wait for provisioning (~2 min).

### Get the two connection strings

Supabase → **Project Settings → Database → Connection string**.

You need **both**:

| Name | Port | Use | Example |
| --- | --- | --- | --- |
| **Pooled** (Transaction mode, PgBouncer) | `6543` | Runtime app connection (serverless / Vercel) | `postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| **Direct** | `5432` | `prisma migrate` / DDL / the data‑import script | `postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres` |

> Prisma needs the **direct** URL for migrations (PgBouncer can't run DDL /
> prepared‑statement‑heavy work) and the **pooled** URL at runtime on Vercel.

---

## 3. Back up MongoDB (do not skip)

```powershell
# from repo root, with $env:DATABASE_URL still pointing at Mongo
./scripts/backup-mongodb.ps1
```

This produces `backups/redrive-<timestamp>.archive.gz` + a SHA‑256 file. Keep it
until the cutover is proven stable for at least a week.

Also take a **JSON export** as a second, portable copy:

```bash
mongodump --uri="$DATABASE_URL" --out ./backups/dump-json --gzip
```

---

## 4. Clean orphaned documents in MongoDB (important)

MongoDB never enforced foreign keys; Postgres will. Any document that points at a
deleted parent (`userId`, `listingId`, `reservationId`, `chatId`, `reportId`,
`reservationId`, …) will **fail to insert** into Postgres.

Run this audit against Mongo **before** migrating. Fix or delete every orphan.

```js
// scripts/audit-orphans.mjs   — run with:  node scripts/audit-orphans.mjs
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.DATABASE_URL);
await client.connect();
const db = client.db(); // db name comes from the URI

const checks = [
  ["Account", "userId", "User"],
  ["Listing", "userId", "User"],
  ["Reservation", "userId", "User"],
  ["Reservation", "listingId", "Listing"],
  ["Payment", "reservationId", "Reservation"],
  ["Payment", "renterId", "User"],
  ["Payment", "ownerId", "User"],
  ["Review", "userId", "User"],
  ["Review", "listingId", "Listing"],
  ["Message", "chatId", "Chat"],
  ["Message", "senderId", "User"],
  ["Notification", "userId", "User"],
  ["PasswordResetToken", "userId", "User"],
  ["AvailabilityBlock", "listingId", "Listing"],
  ["BookingQuote", "userId", "User"],
  ["BookingQuote", "listingId", "Listing"],
  ["UserSession", "userId", "User"],
  ["MobileSession", "userId", "User"],
  ["MobileAuthChallenge", "userId", "User"],
  ["MobilePushToken", "userId", "User"],
  ["WebAuthnCredential", "userId", "User"],
  ["HandoverReport", "reservationId", "Reservation"],
  ["HandoverReport", "submittedById", "User"],
  ["HandoverMedia", "reportId", "HandoverReport"],
  ["IncidentCase", "reservationId", "Reservation"],
  ["IncidentCase", "reporterUserId", "User"],
  ["SavedSearch", "userId", "User"],
  ["MaintenanceRecord", "listingId", "Listing"],
];

for (const [coll, field, parent] of checks) {
  const rows = await db.collection(coll).find({}, { projection: { [field]: 1 } }).toArray();
  const parentIds = new Set(
    (await db.collection(parent).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)),
  );
  const orphans = rows.filter((r) => r[field] && !parentIds.has(String(r[field])));
  if (orphans.length) {
    console.log(`⚠  ${coll}.${field} -> ${parent}: ${orphans.length} orphans`);
    console.log(orphans.slice(0, 10).map((o) => String(o._id)));
  }
}
await client.close();
```

> `BookingQuote.reservationId`, `Reservation.cancelledById`,
> `AuditEvent.actorUserId`, `HandoverReport.acknowledgedByIds`,
> `Notification.data` etc. are **nullable / not real relations** in the schema —
> they don't need FK integrity, so ignore them in the audit.

Delete orphans you don't care about:

```js
await db.collection("Message").deleteMany({ _id: { $in: orphanObjectIds } });
```

---

## 5. Convert `prisma/schema.prisma` to Postgres

Make these **mechanical** edits. Field names, relations, indexes, and defaults
stay exactly the same — only Mongo‑specific attributes are removed.

### 5.1 Datasource

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // pooled (6543) at runtime
  directUrl = env("DIRECT_URL")        // direct (5432) for migrations
}
```

### 5.2 Every model `id`

```prisma
// BEFORE (Mongo)
id String @id @default(auto()) @map("_id") @db.ObjectId

// AFTER (Postgres)
id String @id @default(cuid())
```

- Drop `@default(auto())`, `@map("_id")`, `@db.ObjectId`.
- Use `@default(cuid())` so **new** rows get IDs; **existing** rows keep their
  current 24‑char hex string IDs (imported verbatim — they're just `text`).
- `ApiMetricBucket.id` has no `@default` (deterministic hash id) — just remove
  `@map("_id") @db.ObjectId`, leave it as `String @id`.

### 5.3 Every foreign‑key / id‑list field

```prisma
userId            String   @db.ObjectId   ->  userId            String
licenseReviewedBy String?  @db.ObjectId   ->  licenseReviewedBy String?
favoriteIds       String[] @db.ObjectId   ->  favoriteIds       String[]
allowedUserIds    String[] @db.ObjectId   ->  allowedUserIds    String[]
participantIds    String[] @db.ObjectId   ->  participantIds    String[]
acknowledgedByIds String[] @db.ObjectId   ->  acknowledgedByIds String[]
readByIds         String[] @db.ObjectId   ->  readByIds         String[]
```

Remove **every** `@db.ObjectId`. (Quick check: `grep -n "@db.ObjectId" prisma/schema.prisma` must return nothing when done.)

### 5.4 `@db.String`

Mongo‑only annotation. Replace with `@db.Text` (or just delete it — `String`
maps to `text` on Postgres anyway):

```prisma
refresh_token String? @db.String   ->  refresh_token String? @db.Text
message       String? @db.String   ->  message       String? @db.Text
text          String  @db.String   ->  text          String   // Review.text
```

### 5.5 Leave these UNCHANGED

- `Json?` → automatically `jsonb`.
- `Bytes` (`WebAuthnCredential.publicKey`) → automatically `bytea`.
- `enum NotificationType { … }` → native Postgres enum, same values.
- All `@@index`, `@@unique`, `@relation(… onDelete: …)`, `@default(now())`,
  `@updatedAt`, `@unique`.
- The `generator client { provider = "prisma-client-js" }` block.

### 5.6 `@@index([participantIds])` on `Chat`

Postgres can't B‑tree‑index an array the way Mongo does. Change it to a GIN
index (Prisma supports this):

```prisma
@@index([participantIds], type: Gin)
```

Do the same for any other place you filter an array field with `has` and need it
indexed. (`favoriteIds` etc. are usually filtered in app memory, not the DB —
check your usage; add `type: Gin` only where you actually query with `has`.)

### 5.7 Validate

```bash
npx prisma validate
npx prisma format
```

---

## 6. Create the schema in Supabase

Point env at Supabase and push the schema (creates all tables, no data yet):

```bash
# .env  (local, temporary — use the DIRECT 5432 URL for this step)
DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres"

npx prisma db push
```

`db push` is the right call here because you're starting a fresh database. Once
this is done and stable you can switch to migration history:

```bash
npx prisma migrate dev --name init   # optional: generates prisma/migrations/
```

Verify in Supabase → **Table Editor** that all ~30 tables exist.

> **RLS:** Supabase enables Row Level Security prompts in the dashboard, but your
> app connects as the `postgres` superuser role via Prisma, which **bypasses
> RLS**. You do **not** need to write RLS policies for the app to work. Only add
> them if you later use the Supabase client-side SDK directly (you don't today).

---

## 7. Transfer the data

The migration script uses **two Prisma clients** — the old Mongo schema and the
new Postgres schema — and copies every table in foreign‑key dependency order.
Because Prisma already returns clean JS objects (`id` not `_id`, ObjectIds as
strings, dates as `Date`, `Bytes` as `Buffer`), **no manual field conversion is
needed**.

### 7.1 Keep a copy of the Mongo schema

```bash
git show HEAD:prisma/schema.prisma > prisma/mongo.schema.prisma
```

Edit `prisma/mongo.schema.prisma` so its generator writes to a separate client:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/mongo-client"
}

datasource db {
  provider = "mongodb"
  url      = env("MONGO_DATABASE_URL")
}
```

Generate both clients:

```bash
npx prisma generate --schema prisma/mongo.schema.prisma
npx prisma generate --schema prisma/schema.prisma
```

### 7.2 Env for the import

```bash
# .env  (local, temporary)
MONGO_DATABASE_URL="mongodb+srv://<user>:<pwd>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority"
DATABASE_URL="postgresql://postgres.<ref>:<pwd>@…pooler.supabase.com:5432/postgres"   # DIRECT for the import
DIRECT_URL="postgresql://postgres.<ref>:<pwd>@…pooler.supabase.com:5432/postgres"
```

### 7.3 Run the import

```bash
node scripts/migrate-mongo-to-supabase.mjs
```

See [scripts/migrate-mongo-to-supabase.mjs](../scripts/migrate-mongo-to-supabase.mjs).
It:

- copies tables **parents first** (`User` → `Listing` → `Reservation` →
  `Payment` → …) so FK constraints are satisfied;
- inserts in batches of 500 with `createMany` (falls back to per‑row `create`
  on error so one bad row doesn't abort the table, and logs the offender);
- preserves every `id` and every timestamp exactly;
- prints a **row‑count comparison table** at the end.

Re‑running is safe: it uses `skipDuplicates` and, if you need a clean retry,
`--wipe` truncates the Postgres tables first.

### 7.4 Fix Postgres sequences (only if you added any `autoincrement()` — you didn't)

All IDs here are `String`/`cuid`, so there are **no sequences to reset**. Skip.

---

## 8. Verify

1. **Row counts** — the script prints them; every table must match Mongo.
2. **Spot checks:**

   ```bash
   npx prisma studio        # browse the Postgres data
   ```

   - Open a `User`, confirm `favoriteIds`, `hobbies`, arrays survived.
   - Open a `Reservation`, confirm `quoteSnapshot` / `cancellationPolicySnapshot`
     JSON survived.
   - Open a `WebAuthnCredential`, confirm `publicKey` bytes survived
     (length > 0).
   - Confirm a `Notification.type` shows a valid enum value.
3. **Referential integrity:**

   ```sql
   -- run in Supabase SQL editor; all must return 0
   select count(*) from "Payment" p left join "Reservation" r on r.id = p."reservationId" where r.id is null;
   select count(*) from "Reservation" r left join "Listing" l on l.id = r."listingId" where l.id is null;
   ```
4. **App smoke test against Supabase (local):**

   ```bash
   # .env -> DATABASE_URL = POOLED (6543) url, DIRECT_URL = direct (5432)
   npm run dev
   ```

   - Log in (NextAuth + Prisma adapter).
   - Load listings, open one, view reservations.
   - Create a booking quote, send a chat message, mark a notification read.
   - Run the test suite: `npm test`.

---

## 9. Cutover

Pick a low‑traffic window.

1. **Enable maintenance mode** (or accept a short read‑only window). Optionally
   set a Vercel env flag your `middleware.ts` can check to 503 briefly.
2. **Freeze writes to Mongo.** Take a final `mongodump`.
3. **Re‑run the import** with `--wipe` so Supabase has the absolute latest data
   (the earlier run was a rehearsal). With writes frozen this is fast.
4. **Run the orphan / row‑count / integrity checks again.**
5. **Update production env vars** (Vercel → Project → Settings → Environment
   Variables), for **Production** (and Preview if you want):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase **pooled** `…:6543/postgres?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | Supabase **direct** `…:5432/postgres` |

   Remove/retire the old Mongo `DATABASE_URL`. Keep it recorded somewhere for
   rollback.
6. **Redeploy** (Vercel will run `prisma generate && next build` per your
   `build` script — the Postgres client is generated at build time).
7. **Disable maintenance mode.**
8. **Watch** logs / `ApiErrorEvent` / Supabase **Database → Logs** and
   **Reports** for 30–60 min. Check connection count stays well under the pooler
   limit.

---

## 10. Post‑migration cleanup (after ~1 week stable)

- Delete `prisma/mongo.schema.prisma` and `node_modules/.prisma/mongo-client`.
- Remove `mongodb` from `package.json` dependencies (`npm rm mongodb`) — nothing
  imports it once the migration script is gone. Keep the script in git history.
- Update Mongo‑specific ops scripts:
  - `scripts/backup-mongodb.ps1` → replace with Supabase backups (Supabase does
    daily automated backups on paid plans; for your own dump use
    `pg_dump "$DIRECT_URL" -Fc -f backups/redrive-<stamp>.dump`).
  - `scripts/restore-drill-mongodb.ps1` → `pg_restore` equivalent.
- Update docs: `.env.example`, `guides/ENVIRONMENT_VARIABLES_GUIDE.md`,
  `guides/deploy.md`, `README.md` — swap the "MongoDB via Prisma" wording and
  add `DIRECT_URL`.
- Decommission the MongoDB Atlas cluster (downgrade first, delete after a month).

---

## 11. Rollback plan

Because the app code never changed, rollback is just env + schema:

1. `git revert` the `schema.prisma` commit (back to `provider = "mongodb"`).
2. Restore Vercel `DATABASE_URL` to the Mongo string; remove `DIRECT_URL`.
3. Redeploy.
4. If Mongo took writes you need to preserve during the Postgres window, you'd
   have to reconcile manually — which is why cutover step 2 **freezes Mongo
   writes**. Keep the maintenance window until you're confident.

---

## 12. Quick reference — the only code that changes

```
prisma/schema.prisma          # provider, id fields, @db.ObjectId, @db.String, GIN index
.env / .env.example           # DATABASE_URL (now Postgres), + DIRECT_URL
guides/ENVIRONMENT_VARIABLES_GUIDE.md, guides/deploy.md, README.md   # docs
scripts/backup-mongodb.ps1, scripts/restore-drill-mongodb.ps1       # ops, post-cutover
package.json                  # drop "mongodb" dep, post-cutover
```

Everything under `app/`, `pages/`, `packages/`, `apps/`, `middleware.ts`,
`app/libs/prismadb.ts`, NextAuth config, and every `prisma.*` query stays
**exactly as it is**.
