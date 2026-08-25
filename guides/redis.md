# Redis in Redrive

Redis can improve Redrive's abuse protection, response time, and real-time user
experience. It should complement MongoDB, not replace it. MongoDB remains the
system of record for users, listings, reservations, payments, messages,
notifications, audit events, mobile sessions, and security evidence.

The first implementation slice is now present behind `REDIS_ENABLED`: Redrive
includes the official Redis client and atomic fixed-window rate limiting, with
the existing MongoDB buckets retained as the rollout and outage fallback. The
remaining phases in this guide are not yet implemented.

## Recommended rollout

Adopt Redis in small, measurable phases:

1. Move request rate-limit counters from MongoDB to Redis.
2. Move ephemeral presence and typing state to Redis with short TTLs.
3. Add cache-aside caching for public, privacy-safe listing responses and
   selected third-party lookups.
4. Use Redis Pub/Sub only as a wake-up signal for the existing chat SSE routes;
   continue storing and replaying messages from MongoDB.
5. Consider a durable job queue only after Redrive has a separately deployed
   worker and documented retry/dead-letter operations.

The first phase has the best value-to-risk ratio. `app/libs/security.ts`
currently writes a `RateLimitBucket` record in MongoDB for every active rate
limit window. Redis offers atomic counters and automatic expiry, removing that
hot write path and the related cleanup work from
`app/api/cron/security-maintenance/route.ts`.

## Where Redis fits

| Redrive workload | Redis role | Source of truth | Recommendation |
|---|---|---|---|
| Login, registration, verification, upload, chat, checkout, and mobile API rate limits | Atomic counters with TTL | Redis counter; durable abuse/audit events stay in MongoDB | Implement first |
| Presence and typing indicators | Short-lived keys such as `presence:user:<hash>` and `typing:chat:<chatId>:<userId>` | Redis only | Implement second; losing this state is harmless |
| Public listing discovery | Cache privacy-safe DTOs for a short period | MongoDB listing data | Implement after measuring query latency |
| Listing detail | Cache only the public serializer output | MongoDB listing data | Short TTL plus explicit invalidation |
| Suburb coordinates | Usually keep the current HTTP/CDN cache | Bundled suburb dataset | Redis adds little value here |
| Google Places | Carefully cache suitable server-side results | Google response | Respect provider terms and session-token semantics; do not cache merely to bypass billing |
| Chat and inbox SSE | Pub/Sub notification that new data exists | MongoDB messages/chats | Optional; always re-read authorised data from MongoDB |
| Mobile idempotency | Optional short lock in front of the existing record | MongoDB `IdempotencyRecord` | Keep the MongoDB record for durable replay and conflict detection |
| Stripe webhook deduplication and payout state | Optional lock only | MongoDB `StripeWebhookEvent`, `Payment`, and reservation records | Never make Redis authoritative |
| Mobile refresh sessions and reuse detection | Optional read-through acceleration later | MongoDB `MobileSession` and security/audit records | Do not migrate the source of truth |
| Saved-search notifications, email, push, and payout jobs | Queue coordination after a worker exists | MongoDB business records and provider idempotency | Later phase |

## Data that must not live only in Redis

Do not use Redis as the sole store for:

- reservations, quotes accepted by a user, availability blocks, or pricing;
- Stripe events, charges, transfers, payout decisions, or handover evidence;
- users, licence verification, encrypted licence data, password-reset claims,
  mobile refresh-session history, revocations, or audit events;
- chat messages or notifications that users must be able to retrieve later;
- exact listing addresses, coordinates, registration details, tokens, bank
  details, or other sensitive values in cache keys.

Redis keys can appear in logs, dashboards, metrics, and operational tooling.
Continue using `securityHash()`-style HMAC identifiers for IP addresses and
emails. Cache only the same privacy-safe listing DTOs returned to public web and
mobile clients; never cache a raw Prisma record for those clients.

## Provider and client choice

Redrive is deployed on Vercel, so use a managed Redis service located close to
the Vercel functions and MongoDB region. Two reasonable approaches are:

- **Redis Cloud through the Vercel Marketplace:** standard Redis protocol and
  the official `redis` (`node-redis`) client. This is the preferred baseline
  when Pub/Sub or a conventional Redis API is required.
- **A serverless HTTP Redis provider:** useful when connectionless HTTP access
  is more appropriate for short-lived functions. Its SDK and environment
  variable names will be provider-specific.

Do not add both clients. Select one provider in an architecture decision,
verify its Australian data location, encryption, persistence, high
availability, connection limits, eviction policy, and privacy/compliance terms,
then use one shared adapter so application code is provider-independent.

The examples below use the official `redis` package and a `REDIS_URL`. Redis
documents `redis://` and TLS-enabled `rediss://` connection URLs; production
must use TLS. Vercel's Redis Marketplace integration can provision Redis and
inject its connection details.

References:

- [Redis Node.js client and connection guidance](https://redis.io/docs/latest/develop/clients/nodejs/connect/)
- [Redis rate-limiter pattern](https://redis.io/docs/latest/develop/use-cases/rate-limiter/)
- [Redis on the Vercel Marketplace](https://vercel.com/marketplace/redis/redis)
- [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage)

## Configuration

After a provider is selected, add server-only variables to `.env.example`, the
environment guide, and the matching Vercel Development, Preview, and Production
scopes:

```dotenv
# Server-only. Use rediss:// in production and never expose this as NEXT_PUBLIC_.
REDIS_URL="rediss://<username>:<password>@<host>:<port>"

# Allows a controlled rollout and an immediate fallback to the MongoDB path.
REDIS_ENABLED="false"

# Prefix every key so environments can never collide.
REDIS_KEY_PREFIX="redrive:development"
```

Use distinct Redis databases or credentials for Development, Preview, and
Production. A prefix is useful defence in depth, but it is not sufficient
isolation by itself. Rotate credentials through the provider and Vercel secret
settings; never commit them or put them in an `EXPO_PUBLIC_` variable.

The first slice installs the official client:

```powershell
npm install redis
```

The implemented adapter is `app/libs/redis.ts`. It reuses one connection within
a warm Node.js process, disables the offline command queue, bounds connection
and reconnection attempts, validates the key prefix, and never enters the
client or Expo bundles. `app/libs/redisRateLimit.ts` owns the provider-neutral,
atomic limiter logic. Load-test the connection behaviour against the selected
provider and Vercel runtime before enabling Production.

Future Pub/Sub work requires a separate duplicated subscriber connection; a
connection in subscriber mode cannot also serve ordinary commands.

## Phase 1: distributed rate limiting

Retain the public contract of `consumeRateLimits()` so existing routes do not
need to change. Replace its storage implementation behind that contract.

Each key should include the environment prefix, scope, HMAC of the identifier,
and window boundary:

```text
redrive:production:ratelimit:<scope>:<identifier-hmac>:<window-start>
```

The increment and expiry must be atomic. Do not issue a standalone `INCR`
followed by `EXPIRE`; a failure between them can leave a permanent key. Use a
Lua script, a provider-supported atomic rate-limit primitive, or an equivalent
transaction. Redis documents this race and the atomic patterns in its rate
limiter guidance.

Preserve the current behaviour:

- apply every rule passed to `consumeRateLimits()`;
- return an accurate `Retry-After` value;
- keep identifiers HMACed with `RATE_LIMIT_SECRET`;
- use the existing limits for web and mobile routes unless tests justify a
  policy change;
- keep durable `AuditEvent` writes in MongoDB;
- never fail open for authentication, password reset, verification, licence
  verification, checkout, or account deletion.

For sensitive routes, Redis unavailability should return a temporary `503`
with `Cache-Control: no-store`. For lower-risk discovery endpoints, a bounded
in-process fallback or carefully defined fail-open policy may be acceptable,
but it must be explicit and observable. Avoid silently falling back to MongoDB
on every Redis error because an outage could create a sudden database write
storm.

During rollout, keep `RateLimitBucket` and its cleanup code available behind a
feature flag. Remove that model and cleanup path only after production metrics
show the Redis path is stable and rollback is no longer required.

## Phase 2: presence and typing

`app/api/presence/route.ts` and the chat typing route represent ephemeral state.
They are a natural Redis fit:

```text
redrive:production:presence:user:<userId>             TTL 60-90 seconds
redrive:production:typing:chat:<chatId>:<userId>       TTL 4-6 seconds
```

Authorise the user and chat membership before reading or writing these keys.
Store only timestamps or a small boolean value. Never trust a client-supplied
user ID, and do not expose presence for users who do not share an authorised
context.

TTL should define expiry; no cleanup cron is needed. The UI must treat a Redis
miss or outage as “presence unknown” or “not typing,” not as an application
failure.

## Phase 3: cache-aside reads

Use cache-aside rather than treating Redis as a second database:

1. Build a versioned cache key from normalised, validated query parameters.
2. Read Redis.
3. On a hit, parse and validate the cached DTO.
4. On a miss, query MongoDB and serialize through the existing safe DTO layer.
5. Cache the serialized result with a short TTL and small random jitter.
6. Return the same response shape whether it was a hit or miss.

Suggested starting TTLs, to be tuned from production measurements:

| Data | Initial TTL | Invalidation |
|---|---:|---|
| Public listing detail DTO | 60 seconds | Delete after listing/profile/review changes that affect the DTO |
| Public listing search page | 15-30 seconds | Prefer short TTL first; add tag/version invalidation only if needed |
| Recommendation DTO | 30-60 seconds | Delete or version after relevant listing changes |
| Expensive, non-user-specific admin aggregates | 30 seconds | Admin-only keyspace; never mix with public caches |

Do not cache authenticated responses under a public key. If a response depends
on a user, either do not cache it or include a non-reversible user-specific
partition and keep a very short TTL. Never cache `Set-Cookie`, access tokens,
refresh tokens, verification codes, or signed upload data.

Listing writes should update MongoDB first and invalidate Redis only after the
database operation succeeds. If invalidation fails, the TTL bounds staleness.
For reservation availability and checkout, always validate against MongoDB in
the write transaction/path; a cached result is never authority that a vehicle
is available or a price is valid.

Avoid cache stampedes by adding TTL jitter and, for genuinely expensive keys,
using a short single-flight lock. Locks need unique ownership tokens and an
atomic compare-and-delete release. Do not use a bare `DEL` that could remove a
lock acquired by another request after expiry.

## Phase 4: real-time chat signalling

The current SSE implementation in `app/libs/sse.ts` queries MongoDB every one to
1.5 seconds. Redis Pub/Sub can reduce polling:

```text
Publisher after committed MongoDB write
  -> publish a small event containing chat ID and message ID
  -> authorised SSE subscriber receives the signal
  -> route reads the durable message from MongoDB
  -> existing safe serializer produces the client event
```

Do not publish full message bodies or sensitive user data. Redis Pub/Sub is
not durable: disconnected subscribers miss events. Keep `Last-Event-ID` resume
logic and MongoDB replay as the correctness path. Treat Pub/Sub as a latency
optimisation only.

Before implementing this phase, verify that the selected Vercel runtime and
Redis plan support the required connection duration and concurrency. A managed
realtime service may be a better operational fit if long-lived subscriptions
become the dominant workload.

## Queues and scheduled work

Redis can back queues for notification delivery, saved-search matching, image
post-processing, and payout orchestration, but a queue is not just a list of
jobs. Production use requires:

- a continuously running worker outside request/response functions;
- at-least-once processing with idempotent handlers;
- bounded retries with backoff and a dead-letter path;
- job leases, timeouts, monitoring, alerting, and replay tooling;
- provider and worker persistence appropriate to the business risk.

Payout eligibility and state transitions must still be committed in MongoDB,
and Stripe idempotency keys must remain in use. A queued job may request a
payout check; it must never be the sole evidence that money should move.

Do not replace the existing Vercel crons until the worker deployment and its
operational ownership are ready.

## Failure modes and observability

Redis must have explicit timeout and failure policies. Record metrics without
including keys or personal data:

- operation latency and error rate;
- cache hit/miss ratio by cache family;
- rate-limit allows and rejects by scope;
- connection/reconnection count;
- memory usage, evictions, expired keys, and rejected connections;
- Pub/Sub subscriber health and SSE fallback polling;
- queue depth, oldest job age, retry count, and dead-letter count if queues are
  later introduced.

Alert on evictions in security-related keyspaces, sustained connection errors,
and unexpected rate-limit bypass or rejection spikes. Configure a memory limit
and eviction policy deliberately. Cache keys may be evictable; security
counters should not compete with an unbounded cache. Separate databases or
instances are preferable once workload size or risk warrants it.

Redis must not become a hard dependency for pages that do not use it. Cache
misses should fall back to MongoDB. Security checks should fail closed or use a
tested bounded fallback according to the route's documented policy.

## Verification checklist

Before enabling any phase in Production:

- [ ] Development, Preview, and Production use isolated Redis resources and
      prefixes.
- [ ] Production connections use TLS and least-privilege credentials.
- [ ] No Redis secret is exposed through `NEXT_PUBLIC_` or `EXPO_PUBLIC_`.
- [ ] Keys contain no raw email, IP address, address, token, licence, bank, or
      message content.
- [ ] Every temporary key has a TTL.
- [ ] Rate-limit increment and expiry are atomic under concurrency.
- [ ] Sensitive routes have a tested Redis-outage policy.
- [ ] Cached listing data passes the public/mobile privacy-safe serializer.
- [ ] Listing update, delete, review, and profile-change invalidation is tested.
- [ ] Reservation and payment decisions still revalidate durable MongoDB state.
- [ ] Pub/Sub disconnect and SSE resume tests prove no durable message is lost.
- [ ] Dashboards and alerts exist before the feature flag is enabled broadly.
- [ ] `git diff --check`, relevant tests, `npm run build`, and then
      `npx tsc --noEmit` pass sequentially.

## Concrete first implementation slice

A production-oriented first pull request should remain narrow:

1. Add the chosen client, `app/libs/redis.ts`, documented environment
   variables, and a `REDIS_ENABLED` rollout flag.
2. Add a Redis-backed implementation behind the existing
   `consumeRateLimits()` contract.
3. Add concurrency tests for count, TTL, multiple rules, `Retry-After`, hashed
   identifiers, and Redis outage behaviour.
4. Deploy disabled, confirm connectivity and metrics in Preview, then run abuse
   and outage tests.
5. Enable in Preview, then gradually in Production.
6. Keep MongoDB rate-limit cleanup as a rollback path until the observation
   period is complete.

That slice improves a real hot path without changing Redrive's durable booking,
payment, identity, or privacy boundaries.
