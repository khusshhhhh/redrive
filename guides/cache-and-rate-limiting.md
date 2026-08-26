# Cache and rate limiting

Redrive uses MongoDB for shared rate-limit state and small, bounded process
memory caches for safe performance improvements. There is no Redis dependency
or Redis environment configuration.

## Rate limiting

Sensitive routes continue to call the shared helpers in `app/libs/security.ts`.
Each request is checked in this order:

1. Raw account and IP identifiers are HMACed with `RATE_LIMIT_SECRET`.
2. A process-local fixed-window counter rejects obvious bursts immediately.
3. Requests that pass the local check are recorded in MongoDB
   `RateLimitBucket` records, which remain the cross-instance authority.
4. Rejected requests receive HTTP `429`, `Retry-After`, and
   `Cache-Control: no-store`.

The local counter is intentionally limited to 10,000 entries and expires entries
without background timers. It can disappear on a deployment, restart, or
serverless scale-out without weakening the real limit because every locally
accepted request is still checked by MongoDB.

The scheduled security-maintenance route deletes expired database buckets.
`RATE_LIMIT_SECRET` is still required and must remain server-only. Never put raw
email addresses, user identifiers, or IP addresses in counter keys or logs.

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
