# Rendering & Page-Load Performance Assessment

**Question asked:** "Enable SSR so pages load faster."

**Finding:** SSR is already fully enabled — this is a Next.js 15 App Router app and
every non-`"use client"` page is server-rendered by default. The app is actually
configured for the *most aggressive* server rendering mode possible
(`force-dynamic` at the root), which is **why some pages are slower than they
need to be**. The path to faster loads is to do *less* per-request server work on
pages that don't need it, plus stream the ones that do.

No database change and no application-structure change is required for any of
this.

---

## 1. Current rendering configuration

### The root bottleneck

[`app/layout.tsx:92`](../app/layout.tsx#L92):

```ts
export const dynamic = "force-dynamic";
```

Placed on the **root layout**, this forces **every route in the app** to be
dynamically rendered on every request. It disables:

- static generation (SSG) for pages whose content never varies per user,
- the Next.js full-route cache / CDN edge caching,
- ISR (incremental static regeneration).

Even if that line were removed, the root layout would *still* be dynamic, because
it calls [`getCurrentUser()`](../app/actions/getCurrentUser.ts) during render,
which calls `getServerSession()` → reads cookies → opts the whole tree into
dynamic rendering. And `getCurrentUser()` also runs a Prisma
`user.findUnique()`.

**Net effect:** every page load — including a static blog article — pays for:
1. a cold/warm serverless function invocation,
2. `getServerSession()` (JWT decode + cookie parse),
3. one `prisma.user.findUnique()` round-trip to the database,

…before **any** HTML is produced. `React.cache()` on `getCurrentUser` only
dedupes within a single request; it does not cache across requests.

### Per-route inventory

| Route | Component | Data it needs | Should be | Today |
| --- | --- | --- | --- | --- |
| `/blog`, `/newsroom`, `/help-centre` | server | none — static imports from `app/content/editorial` | **Static (SSG)** | forced dynamic |
| `/blog/[slug]`, `/newsroom/[slug]`, `/help-centre/[article]` | server, **already has `generateStaticParams()`** | none — static content | **Static (SSG)** | forced dynamic (author's intent defeated) |
| `/[slug]` (legal/privacy/terms) | server, **already has `generateStaticParams()`** | none — static content | **Static (SSG)** | forced dynamic |
| `/` (home) | server | listings + weekend listings + `getCurrentUser` + favorites (via `Promise.all` ✅) | **ISR + streamed personal bits** | fully dynamic, blocks on all four |
| `/listings/[listingId]` | server | `getListingById` → `getReservationDateRanges` → `getCurrentUser` (**sequential `await`**, not parallel) | **ISR + streamed personal bits** | fully dynamic, 3 sequential round-trips |
| `/compare` | server | `getComparisonListings(ids)` from query string | dynamic (query-driven) — fine | dynamic |
| `/trips`, `/reservations`, `/properties`, `/favorites`, `/profile`, `/confirm-reservation`, `/edit-utility/[id]` | server, **has `loading.tsx` ✅** | per-user data | dynamic + streaming — **already correct** | dynamic + streaming ✅ |
| `/messages`, `/messages/[chatId]`, `/reservations/[id]`, `/review/[id]`, `/forgot-password`, `/reset-password`, `/listings/[id]/images` | **client** (`"use client"`) | client-fetched | client — fine | client |
| `/admin/*` | server, `force-dynamic` (explicit, correct) | admin data | dynamic — correct | dynamic ✅ |

### What's already good

- `loading.tsx` exists in 12 routes → those already **stream** (server sends the
  shell immediately, fills content when data resolves).
- The home page uses `Promise.all` for its four data sources.
- `middleware.ts` only guards the 9 genuinely private route prefixes — public
  pages are not being auth-checked at the edge.
- `Navbar` and `AppShell` are **already `"use client"`** and simply receive
  `currentUser` as a prop — so decoupling them from the server layout is a
  contained change, not a rewrite.
- Static content already lives in plain modules (`app/content/editorial`), and
  three route groups already declare `generateStaticParams()`.

---

## 2. Problems, ranked by impact

### P1 — Static content pages are served as dynamic functions
`/blog/*`, `/newsroom/*`, `/help-centre/*`, `/[slug]` render from static imports
and change only on deploy, yet every visit runs a serverless function + session
check + DB query. These pages should be HTML files on the CDN with ~0 ms TTFB.
**This is the single biggest, lowest-risk win.**

### P2 — Root layout blocks every render on session + DB
`getCurrentUser()` in `app/layout.tsx` puts a `getServerSession()` + a Prisma
query on the critical path of *every* navigation, and forces dynamic rendering
app-wide. Moving session hydration to the client (or a Suspense boundary) removes
that floor and unblocks P1 for pages inside the layout.

### P3 — `force-dynamic` on the root layout
The explicit line compounds P2. Even after P2, this line must be removed for
static/ISR to take effect. Safe to remove *only once P2 is done*.

### P4 — `/listings/[listingId]` does 3 sequential DB round-trips
`getListingById` → `await` → `getReservationDateRanges` → `await` →
`getCurrentUser`. These are independent; `Promise.all` cuts the wait to the
slowest one. Plus the listing + date data is cacheable (ISR); only the
"is this my listing / am I logged in" part is per-user and can stream.

### P5 — Home page personal data blocks the listings grid
`getCurrentUser()` + `favoriteListings` are in the same `Promise.all` as the
public listings. Wrapping the personalised parts in `<Suspense>` lets the
listings grid (the thing users came for) paint first.

---

## 3. Recommended plan

Phased so each step is independently shippable and testable.

### Phase A — Static content pages (P1)  ·  ~half a day  ·  low risk

For `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`, `app/newsroom/page.tsx`,
`app/newsroom/[slug]/page.tsx`, `app/help-centre/page.tsx`,
`app/help-centre/[article]/page.tsx`, `app/[slug]/page.tsx`:

- These can't go static while the root layout is dynamic. Two options:
  - **A1 (preferred):** do Phase B first, then these become static automatically
    once `generateStaticParams()` + no dynamic APIs are present.
  - **A2 (quick, partial):** add `export const revalidate = 3600` to each. This
    gives ISR — first hit after each hour regenerates in the background, everyone
    else gets a cached response. Still pays the dynamic cost only once/hour/page
    instead of every request.
- **Expected gain:** blog/help/legal TTFB from ~300–800 ms (cold fn + session +
  DB) to ~10–50 ms (CDN cache hit).

### Phase B — Decouple session from the server layout (P2 + P3)  ·  ~1–2 days  ·  medium risk

1. Add a `SessionProvider` (`next-auth/react`) high in the client tree (or a
   small `CurrentUserProvider` client context).
2. Change `Navbar`, `AppShell`, `DataPreloader`, `IdleSessionGuard` to read the
   user from `useSession()` / that context instead of the `currentUser` prop.
3. Remove the `getCurrentUser()` call and the `currentUser` prop threading from
   `app/layout.tsx`.
4. Remove `export const dynamic = "force-dynamic"` from `app/layout.tsx`.
5. Pages that genuinely need the user server-side (`/`, `/listings/[id]`) keep
   calling `getCurrentUser()` **in the page**, not the layout — so only those
   pages are dynamic, and only for the personalised subtree.
6. Test matrix: logged-out, logged-in, session-expiry mid-session, idle-timeout
   guard, the 9 middleware-protected routes, admin routes, mobile bottom nav
   auth state.

- **Expected gain:** every page loses a `getServerSession()` + one DB query from
  its critical path. Static pages become truly static. Navigations feel snappier
  app-wide. Slight trade-off: the navbar's logged-in state hydrates a beat after
  first paint (standard for this pattern; can show a skeleton avatar).

### Phase C — Streaming + parallelism on the two dynamic pages (P4 + P5)  ·  ~1 day  ·  low risk

- `/listings/[listingId]`: `Promise.all([getListingById, getReservationDateRanges])`;
  add `export const revalidate = 120` for the listing/availability data; wrap the
  "owner actions / booking widget for this user" in `<Suspense>` with a fallback.
- `/`: keep public listings on the fast path; move `getCurrentUser()` +
  `favoriteListings` into a `<Suspense>`-wrapped child component so the grid
  paints without waiting on them.
- **Expected gain:** listing detail LCP down by one full DB round-trip; home
  grid visible ~1 round-trip sooner.

### Phase D — Optional, later

- `experimental.ppr` (Partial Prerendering) in `next.config.js` — prerender the
  static shell of `/` and `/listings/[id]`, stream the dynamic holes. Experimental
  in Next 15; revisit when stable.
- Route-segment `export const fetchCache` tuning if any `fetch()` calls are added.

---

## 4. What NOT to do

- **Don't** add `"use client"` to server pages to "speed them up" — that ships
  more JS and makes first paint slower, not faster.
- **Don't** convert the whole app to static — `/trips`, `/reservations`,
  `/profile` etc. are correctly dynamic and already stream via `loading.tsx`.
- **Don't** touch the database or Prisma for this — rendering mode is a Next.js
  concern, independent of the Mongo→Supabase migration.
- **Don't** remove `force-dynamic` from `app/layout.tsx` before Phase B — the
  layout would still be dynamic (cookies) but you'd lose the explicit signal and
  gain nothing.
- **Don't** cache anything user-specific at the route level (`revalidate` on a
  page that renders per-user data will leak one user's view to another).

---

## 5. Implementation status — Phases A, B, C shipped (2026-08-28)

All three phases are implemented, type-checked, linted, unit-tested (66/66) and
verified with `next build`.

### Phase B — session moved off the server layout

| File | Change |
| --- | --- |
| `app/api/me/route.ts` *(new)* | `GET /api/me` → `{ currentUser: SafeUser \| null }`, `force-dynamic`, `no-store`, wrapped in `monitorApiRoute` |
| `app/providers/CurrentUserProvider.tsx` *(new)* | Client context. Fetches `/api/me` on mount, on window focus, on `visibilitychange`, and on a `redrive:auth-changed` event. Exposes `{ currentUser, isLoading, isAuthenticated, refresh }` + `notifyAuthChanged()` |
| `app/layout.tsx` | Removed `getCurrentUser()` call, removed `export const dynamic = "force-dynamic"`, wrapped the client subtree in `<CurrentUserProvider>`, dropped all `currentUser` / `isAuthenticated` prop threading |
| `Navbar`, `UserMenu`, `AppShell`, `Footer`, `MobileBottomNav`, `DataPreloader`, `IdleSessionGuard` | Read `useCurrentUser()` instead of props |
| `UserMenu` | Shows a neutral pulsing avatar placeholder while `isLoading` (no "logged-out → logged-in" flash for returning users) |
| `LoginModal` | `finishLogin()` calls `notifyAuthChanged()` (credential login uses `redirect:false`, so nothing else would refresh the navbar). Sign-out and OAuth already do a full document navigation |
| `app/actions/getCurrentUser.ts` | Catch block now **re-throws** Next's `DYNAMIC_SERVER_USAGE` control-flow error instead of swallowing it as `null` (kept every route's dynamic marking honest and cleaned up build-log noise) |

Trade-off accepted: on a static/ISR page the navbar's signed-in state now
hydrates a beat after first paint. `UserMenu` renders a skeleton avatar during
that window so it reads as "loading", not "logged out".

### Phase A — content pages are now static

`export const dynamic = "force-static"` added to `app/blog/page.tsx`,
`app/blog/[slug]/page.tsx`, `app/newsroom/page.tsx`,
`app/newsroom/[slug]/page.tsx`, `app/help-centre/page.tsx`,
`app/help-centre/[article]/page.tsx`, `app/[slug]/page.tsx`.

Build output confirms:

| Route | Before | After |
| --- | --- | --- |
| `/blog`, `/newsroom`, `/help-centre` | ƒ Dynamic | ○ Static |
| `/blog/[slug]` (7), `/newsroom/[slug]` (13), `/help-centre/[article]` (12), `/[slug]` (11) | ƒ Dynamic | ● SSG (prerendered at build) |
| `/forgot-password`, `/reset-password`, `/confirm-reservation`, `/messages` | ƒ Dynamic | ○ Static shell (bonus — client pages whose shell no longer needs the server) |

43 content URLs that were cold serverless functions + a session lookup + a DB
query per hit are now static assets served from the CDN.

### Phase C — the two hot dynamic pages

| File | Change |
| --- | --- |
| `app/actions/getListingById.ts` | Inner query wrapped in React `cache()`, keyed on the `listingId` **string** so `generateMetadata` and the page share one DB read instead of two. Also returns `null` (not a thrown error) for a missing id |
| `app/listings/[listingId]/page.tsx` | The three independent reads (`getListingById`, `getReservationDateRanges`, `getCurrentUser`) now run in `Promise.all` instead of three sequential `await`s. Explicit `export const dynamic = "force-dynamic"` with a comment explaining why it stays dynamic (viewer identity + live availability must never be cached) |

`/listings/[listingId]` deliberately stays dynamic — ISR would let a
just-booked date still show as available for the revalidation window. The win
here is latency (one DB round-trip instead of ~3), not caching.

Explicit `export const dynamic = "force-dynamic"` also added to `/trips`,
`/reservations`, `/properties`, `/favorites`, `/profile` — they were already
dynamic via the session lookup; the export documents the intent and skips the
static-generation probe at build time.

### Follow-ups not done

- Home page `/` personal-data streaming (`<Suspense>` around the favourites /
  recommendations block so the listings grid paints first) — needs `ListingCard`
  to read `useCurrentUser()` for the favourite heart; deferred as a separate
  change.
- Phase D (PPR) — unchanged recommendation: wait for it to leave experimental.
- `sessionIdleTimeoutMs()` is read in the root layout, so for a **static** page
  its value is baked at build time. It's a rarely-changed ops knob with a safe
  default and a redeploy picks up changes; noted, not fixed.

---

## 6. Summary

| Phase | Effort | Risk | Payoff |
| --- | --- | --- | --- |
| A — ISR on content pages | 0.5 d | low | Big TTFB win on marketing/blog/legal |
| B — session off the server layout | 1–2 d | medium | Removes per-request session+DB floor app-wide; unlocks true static |
| C — stream + parallelise `/` and `/listings/[id]` | 1 d | low | Faster LCP on the two highest-traffic dynamic pages |
| D — PPR | later | — | Incremental, wait for stable |

Recommended order: **B → A → C** (B unlocks A's full benefit), or **A2 → B → A1 → C**
if you want a visible win this week before the medium-risk refactor.
