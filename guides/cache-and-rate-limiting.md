# Cache and rate limiting

Redrive rate-limits sensitive routes with a small bounded process-memory
burst filter in front of a shared store — Upstash Redis when configured,
MongoDB otherwise.

## Rate limiting

Sensitive routes call the shared helpers in `app/libs/security.ts`. Each
request is checked in this order:

1. Raw account and IP identifiers are HMACed with `RATE_LIMIT_SECRET`.
2. A process-local fixed-window counter rejects obvious bursts immediately.
3. Requests that pass the local check are counted in the shared store:
   - **Upstash Redis** (`app/libs/rateLimitStore.ts`) when
     `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set — one atomic
     op per rule, no held connection. This is the recommended path once traffic
     is real: the MongoDB path adds a round-trip on exactly the requests that
     most need to be fast (login, reservation, upload).
   - **MongoDB `RateLimitBucket`** upsert otherwise. Cleaned nightly by the
     security-maintenance cron.
4. Rejected requests receive HTTP `429`, `Retry-After`, and
   `Cache-Control: no-store`.

The local counter is limited to 10,000 entries and expires entries without
background timers. It can disappear on a deployment, restart, or scale-out
without weakening the real limit because every locally accepted request is
still checked by the shared store. A Redis outage fails open to "allowed" (the
local burst filter still applies).

`RATE_LIMIT_SECRET` is required and must remain server-only. Never put raw
email addresses, user identifiers, or IP addresses in counter keys or logs.

## Free Upstash tier

Upstash Redis has a free tier (500K commands/month, 256 MB) that comfortably
covers early-stage rate-limit traffic. Create a database at
<https://upstash.com>, copy the **REST** URL + token into the two env vars, and
redeploy — no code change. Nothing else in the app uses Redis.

## Public listing cache

Anonymous listing discovery uses two short-lived layers:

| Layer | Limit | Lifetime | Purpose |
|---|---:|---:|---|
| Process memory | 50 query variants | 5 seconds | Avoid repeated work inside one warm server process |
| Next.js data cache | Framework managed | 15 seconds | Reuse privacy-safe public results across requests |

Owner-specific listing queries bypass both layers. The cached values are the
same public listing objects already returned by the discovery action; private
owner records, licences, messages, payment data, and exact private location data
must never be added to this cache.

Listing create, update, delete, and availability changes clear the local cache
and revalidate the shared `public-listings` tag. Booking and availability writes
still query MongoDB directly, so cached discovery data never decides whether a
vehicle can be booked.

## Operational expectations

- Memory caches are best-effort optimisations, not durable storage.
- Cache sizes and lifetimes are fixed in code to prevent unbounded memory use.
- A cold process simply misses the cache and reads the authoritative source.
- MongoDB remains required for correct distributed rate limiting.
- Review database latency and `429` telemetry before changing limits or TTLs.
- Run `npm test`, `npm run build`, and `npx tsc --noEmit` after changing these
  helpers or their call sites.

If the application later needs a dedicated distributed cache, add one only from
measured demand and keep the same source-of-truth and privacy boundaries.
