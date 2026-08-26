# Redrive feature opportunities and product roadmap

Updated: 18 August 2026

## Next product proposal — 18 August 2026

The next phase should turn Redrive from a marketplace people visit occasionally into a useful trip companion they return to. The strongest approach is a simple loop: help guests discover the right vehicle, make choosing feel safe, preserve their progress, and bring them back only when something genuinely relevant changes.

### Shipped in today's mobile navigation pass

- **Compact mobile header:** the full-width search field is replaced by one accessible search icon, leaving more room for content.
- **Clear Redrive identity:** the Coast and Country mark and wordmark are visible in the mobile header.
- **Simpler account access:** the mobile user menu is opened by the avatar alone; the hamburger icon is removed on small screens.
- **Search-state continuity:** a small wattle-coloured indicator appears on the search icon when filters are active.
- **Reduced mobile clutter:** notifications remain available in the product, while the small-screen header focuses on logo, search and account.

### Recommended next engagement sprint

| Order | Proposal | User benefit | First implementation | Success measure |
|---|---|---|---|---|
| 1 | Continue where you left off | Users can return to their last search, viewed vehicles and unfinished booking | Add a signed-in home module backed by recent views and the latest meaningful search | Return visit to listing rate |
| 2 | Account-synced saved searches | A useful reason to return when suitable inventory appears | Persist saved filters in Prisma and offer opt-in daily or weekly alerts | Alert-to-listing open rate |
| 3 | Compare up to three vehicles | Reduces tab switching and decision fatigue | Add a sticky compare tray with total price, seats, transmission, rating and key features | Compare-to-request conversion |
| 4 | Trust-forward listing cards | Users understand quality before opening every listing | Show rating confidence, response time, verified-host state and total trip price when dates exist | Listing-to-request conversion |
| 5 | Booking readiness checklist | Fewer surprises after a user decides to book | Show profile, email and licence readiness with one next action | Started-to-completed request rate |
| 6 | Real recommendation rails | Discovery feels relevant without opaque AI | Rank real inventory using location, availability, favourites and recent views, with a visible reason | Recommendation save rate |

### Implementation progress — 18 August 2026

| Order | Status | Delivered |
|---|---|---|
| 1 | Implemented | Signed-in “Continue your journey” module with the latest submitted search and up to four recently viewed vehicles; signed-out visitors retain browser-local history |
| 2 | Implemented | Authenticated Prisma saved-search CRUD, cross-device management, Off/Daily/Weekly controls and scheduled in-app alerts for newly added matching inventory |
| 3 | Implemented | Persistent compare controls, mobile-safe sticky tray and `/compare` table for up to three vehicles with date-aware vehicle totals and key attributes |
| 4 | Implemented | Listing cards now show real review confidence, verified-host state, measured host response time where history exists and estimated vehicle totals when dates are selected |
| 5 | Implemented | Signed-in booking-readiness checklist for profile, email and driving licence with one prioritized next action |
| 6 | Implemented | Mock recommendations replaced by real inventory ranked by requested/profile location, date availability, favourites, recent views, reviews and verified-host state, with visible reasons and “show less” control |

Operational note: saved-search alerts use the existing daily Vercel notification cron and `CRON_SECRET`. Host response-time labels begin appearing after hosts approve or decline new booking requests because Redrive now records a dedicated response timestamp instead of estimating from unrelated activity.

### UI/UX improvements implemented — 18 August 2026

1. **Focused mobile search sheet — implemented:** the header icon opens a full-height three-step Location and vehicle → Dates → Guests and budget flow. Session-backed draft state survives closing and reopening; desktop keeps the complete form.
2. **Total-price clarity — implemented:** dated listing cards and booking surfaces lead with the estimated trip total and retain the daily rate as supporting context.
3. **Better card scanning — implemented:** titles stay within two lines, ratings occupy a fixed scan position, pricing follows one hierarchy and the first image remains dominant.
4. **Purposeful home sections — implemented:** “Available this weekend” uses reservation-aware availability, “Popular” requires real reviews and “Work-ready utilities” uses real ute, van and truck inventory. Every row hides below three credible results.
5. **Helpful empty states — implemented:** users can deliberately expand from suburb to state, remove dates, change vehicle type or reset everything; untouched filters remain visible and preserved.
6. **Fast perceived performance — implemented:** first listing images are prioritized, compact and grid skeletons match card proportions, and existing measured header spacing prevents content jumps.
7. **Accessible mobile controls — implemented for changed surfaces:** the new search, favourite, empty, retry and modal controls use 44px targets, visible focus, useful labels, safe-area padding and reduced-motion fallbacks.
8. **Consistent feedback — implemented:** favourites update optimistically with specific success/error language, booking and messages preserve user state on recoverable failures, and shared retry UI replaces dead ends.

### Engagement principles and guardrails

- Ask for alert permission only after a user saves a search or favourite; default to a digest instead of frequent messages.
- Every recommendation should say why it appears and offer “Show less like this”.
- Measure useful outcomes—return visits, saves, comparisons and completed booking requests—not raw screen time.
- Never expose an exact vehicle address in discovery, analytics or engagement messages.
- Avoid fake urgency, countdown timers, fabricated popularity and notification badges that do not represent real user value.

### Suggested two-week delivery slice

1. ~~Polish and test the new mobile search sheet opened by the header icon.~~ Completed 18 August 2026.
2. ~~Add a reusable “Continue your search” module using existing recent-view/search state.~~ Completed 18 August 2026.
3. ~~Build the compare tray for up to three listings.~~ Completed 18 August 2026.
4. Add the core funnel events: search submitted, listing viewed, favourite saved, compare started and booking request completed—without addresses or full query strings.
5. Run mobile QA at 320px, 375px and 430px, plus keyboard, 200% zoom and reduced-motion checks.

## Airbnb-inspired discovery and UI opportunities — 17 August 2026

Airbnb's current product direction separates discovery into clear modes, keeps search prominent, uses strong visual collections, makes saved items easy to return to and provides persistent mobile navigation. Redrive should borrow those interaction principles while remaining a vehicle marketplace with its own Coast and Country visual identity.

### Shipped in this UI pass

- **Persistent mobile navigation:** Explore, Favourites, Trips, Inbox and Profile are now one tap away. Signed-out users receive the existing sign-in flow for private areas instead of reaching a dead end.
- **Stronger discovery hierarchy:** the home grid now has a clear editorial heading, useful availability count and calmer spacing.
- **Faster booking recognition:** eligible cards show a restrained Instant Book signal without covering the vehicle photo.
- **Mobile-safe continuity:** the page and footer reserve space for the bottom navigation, including phone safe areas.

### New product proposals

| Priority | Feature | Redrive adaptation | Main measure |
|---|---|---|---|
| P0 | Total-price-first cards | Show the estimated trip total after dates are selected, with daily price secondary | Listing-to-booking conversion |
| P0 | Search results map/list switch | Let users alternate between the vehicle grid and privacy-safe suburb circles | Search refinement rate |
| P1 | Redrive Favourites quality badge | Award an explainable badge using verified host, complete listing, reviews and response reliability | Booking confidence |
| P1 | Flexible road-trip dates | Add weekend, month and plus-or-minus-one-day discovery modes | Zero-result recovery |
| P1 | Curated journey collections | Editorial rows such as “Weekend campers near Adelaide” and “Work-ready utes” using real inventory | Collection engagement |
| P1 | Collaborative trip boards | Let a group save vehicles, vote and add short notes before choosing | Shared-board conversion |
| P1 | Booking journey timeline | Combine request, verification, payment, pickup and return into one visible trip status timeline | Support contacts per trip |
| P2 | Road-trip services marketplace | Optional host-provided delivery, setup, cleaning or equipment add-ons with clear pricing and eligibility | Add-on attachment rate |
| P2 | Personalised discovery controls | Explain recommendations and let users tune vehicle type, distance and trip purpose | Recommendation saves |

### UI direction

1. Keep search and core navigation persistent, but reduce competing header actions on small screens.
2. Use large vehicle imagery, short titles, total-price clarity and one primary action per surface.
3. Prefer horizontally scrollable curated collections only when each row has a distinct user purpose; keep ordinary search results in a predictable grid.
4. Use motion for state changes and feedback, never continuous decoration; respect reduced-motion preferences.
5. Keep the Redrive teal, eucalyptus and wattle palette. Airbnb is a usability reference, not a branding template.
6. Preserve suburb-level public location privacy when a future map/list switch is introduced.

## Implementation update — 17 August 2026

This roadmap now distinguishes shipped repository work from foundations and work that requires an external provider, production credentials or a product/legal decision. “Implemented” means code is present and the production build passes; database indexes and new collections still require the deployment command in the implementation report.

| Area | Status | Delivered now | Remaining before production completion |
|---|---|---|---|
| 1.1 Rate limiting | Implemented | Shared MongoDB account/IP buckets on signup, login, verification, resend, recovery and booking; privacy-safe hashed keys and `429` responses | Tune limits from production telemetry; optional risk-based CAPTCHA |
| 1.2 Passkeys and step-up | Foundation | `WebAuthnCredential` model and existing email OTP | WebAuthn ceremony, browser UI and fresh-auth challenge need a relying-party/domain decision |
| 1.3 Sessions/devices | Foundation | Revocable `UserSession` model and password-reset revocation | NextAuth JWT-to-device registration and Security-page UI |
| 1.4 Recovery | Mostly implemented | Generic forgot-password response, hashed single-use 30-minute tokens, reset pages, password rotation and session revocation | Downloadable one-time recovery codes |
| 1.5 RBAC/audit | Implemented core | Existing admin allow-list/role checks, append-only audit writer, protected audit API and audited sensitive actions | Tamper-evident export/retention policy and full admin UI filter |
| 1.6 Licence lifecycle | Implemented core | Authenticated Cloudinary assets, owner/admin-only signed delivery, pending/verified/rejected/expired states, admin review API and daily expiry task | Malware scanning provider and a visual review queue |
| 1.7 Browser policy | Implemented | CSP, HSTS, frame, MIME, referrer, permissions and opener policies | Remove CSP inline/eval allowances after nonce migration; monitor report-only violations first |
| 1.8 Backup/restore | Operational tooling | Timestamped compressed backup with checksum and guarded non-production restore-drill scripts | Schedule encrypted off-site storage, retention and named operator ownership |
| P0 booking integrity | Implemented core | Server-priced quotes, snapshot/version, overlap checks, blocked dates, controlled transitions, retained cancellations and refund estimate | Payment-provider refund execution and iCalendar sync |
| P0 handover | API implemented | Participant-only pickup/return reports, readings, checklist, acknowledgement and audit events | Trip-page form and guided photo capture/alignment UI |
| P0 location privacy | Implemented | Exact address/coordinates withheld until approval while owner retains access | Configurable host release-rule UI |
| P0 payments/payouts | Provider required | Payment status and quote foundations | Stripe Connect onboarding, AU marketplace/legal decisions, webhooks, disputes, refunds and payout reconciliation |
| P0 WCAG 2.2 | In progress | Accessible recovery forms and existing semantic improvements | Full keyboard, screen-reader, zoom, contrast and automated/manual audit across every route |
| P1 safety/operations | API foundation | Incident cases, licence review, audit events, maintenance/saved-search/feature-flag data models | Complete user/admin surfaces and notification workers |
| P1/P2 discovery and trip tools | Roadmap retained | Data foundations and existing search/map/content features | Comparison, real recommender, route/range integrations, PWA offline cache and fleet UI remain separate product increments |

The detailed delivery evidence, deployment steps, security limitations and validation results are in `SECURITY_FEATURE_IMPLEMENTATION_REPORT.md`.

## Purpose

This document proposes practical features that can make Redrive safer, easier and more valuable for guests, hosts and administrators. It is based on the current Next.js, NextAuth, Prisma/MongoDB, Cloudinary, Google Maps and SMTP architecture in this repository.

The recommendations deliberately do not count these existing capabilities as new work:

- Multi-step signup, email verification and optional login codes
- Profile and driving-licence upload with booking readiness checks
- State/suburb search and privacy-safe suburb maps
- Favourites and recently viewed listings
- Booking requests, host approval, reviews, notifications and live chat
- Searchable Help Centre, journal, newsroom and SEO pages
- Protected admin dashboard and marketplace analytics

Some components currently describe advanced features using local storage or mock listings. Those should be connected to real database records before being promoted as production functionality.

## Recommended priorities

| Priority | Feature | User value | Delivery effort | Why now |
|---|---|---:|---:|---|
| P0 | Authentication abuse protection | Very high | Medium | Protects every account and administrator |
| P0 | Guided pickup and return report | Very high | Medium | Creates evidence and reduces disputes |
| P0 | Real marketplace payments and payouts | Very high | High | Turns booking requests into complete transactions |
| P0 | Availability calendar and blocked dates | Very high | Medium | Prevents avoidable booking conflicts |
| P0 | Cancellation and refund workflow | High | Medium | Gives both parties a predictable self-service process |
| P1 | Host verification and admin review queue | High | Medium | Improves listing trust and operational control |
| P1 | Cross-device saved searches and alerts | High | Medium | Brings guests back when matching supply appears |
| P1 | Guest vehicle comparison | High | Low | Makes choosing easier without adding marketplace risk |
| P1 | Incident and dispute centre | Very high | High | Gives safety issues a structured, auditable workflow |
| P1 | Host earnings and utilisation dashboard | High | Medium | Helps good hosts improve availability and pricing |
| P2 | Trip-fit and route planner | High | High | Differentiates Redrive for Australian adventures |
| P2 | Installable offline trip companion | High | Medium | Useful in areas with unreliable reception |

## 1. Security and trust

### 1.1 Layered login and signup rate limiting — P0

Protect signup, password login, email-code generation, verification, password recovery, uploads and admin sign-in with separate limits per account identifier and per IP/network. Add progressively longer temporary cooldowns and generic `429` responses.

Why it helps:

- Reduces credential stuffing, password spraying, email-code abuse and automated account creation.
- Protects one user even when attempts come from many IP addresses.
- Protects the whole service when one IP tries many accounts.

Implementation notes:

- Keep MongoDB rate-limit buckets as the shared cross-instance authority; use bounded process memory only to reject obvious bursts earlier.
- Hash email/IP keys before storage and keep short retention periods.
- Add admin metrics for blocked attempts without logging passwords, OTPs or full session tokens.
- Only introduce a CAPTCHA after suspicious behaviour; do not make every legitimate user solve one.

Success measure: reduced failed-login bursts and email-code volume without increasing legitimate login abandonment.

### 1.2 Passkeys and step-up authentication — P1

Offer passkeys from Profile > Security while keeping email/password and Google sign-in during migration. Require a fresh passkey, password or OTP before sensitive actions such as changing payout details, downloading licence documents, making an administrator role change or deleting an account.

Why it helps:

- Passkeys provide passwordless multi-factor authentication using device biometrics or a PIN.
- Step-up checks protect sensitive actions even if an existing session is stolen.

Data additions: `WebAuthnCredential`, credential ID, public key, counter, transports, created date and last-used date. Never store biometric data; the authenticator keeps it on the user’s device.

### 1.3 Active sessions and trusted devices — P1

Create a Security page listing approximate device type, browser, last activity and coarse sign-in region. Let users revoke one session or “sign out everywhere.” Send a security email when a new device signs in or critical profile information changes.

Avoid displaying exact IP history to ordinary users. Keep server-side session/audit details for a documented retention period.

### 1.4 Account recovery codes and password reset — P0

Add a complete forgotten-password flow with single-use, short-lived, hashed tokens. When users enable stronger authentication, provide downloadable one-time recovery codes and allow regeneration after re-authentication.

Required controls:

- Do not reveal whether an email exists on the password-reset screen.
- Revoke outstanding tokens after a successful reset.
- Notify the account by email after a password or recovery setting changes.
- Optionally revoke all existing sessions after reset.

### 1.5 Admin roles and immutable audit trail — P0

Replace the single `ADMIN` concept with least-privilege roles such as Support, Verification Reviewer, Finance, Content Editor and Super Admin. Record who viewed a sensitive document, changed verification, altered a booking, issued a refund or changed another administrator’s role.

Suggested `AuditEvent` fields:

```text
id, actorUserId, action, targetType, targetId,
reason, beforeSummary, afterSummary, ipHash,
userAgentSummary, createdAt
```

Audit logs should be append-only from the application, searchable in admin and excluded from ordinary application logs.

### 1.6 Licence and identity-document lifecycle — P0

The current image validation is a strong starting point. Extend it with:

- Private delivery URLs that expire instead of long-lived public document URLs
- Antivirus or malware scanning before a file becomes reviewable
- Separate reviewer permission from general support access
- Visible upload, pending, verified, rejected and expired states
- Rejection reasons with a safe re-upload path
- Expiry reminders and automatic booking lock when required credentials expire
- A retention/deletion policy so identity files are not kept indefinitely

Do not label a submitted licence as government-verified unless an actual verification process has completed.

### 1.7 Security headers and browser policy — P0

Introduce and monitor a Content Security Policy, HSTS in production, clickjacking protection, restrictive referrer policy and a permissions policy for camera, microphone and geolocation. Start CSP in report-only mode to discover legitimate Google Maps, Cloudinary and analytics dependencies before enforcing it.

### 1.8 Backups and restore drills — P0

Configure encrypted MongoDB backups, document Cloudinary recovery limitations and perform a timed restore rehearsal. A backup that has never been restored is only an assumption.

Success measure: a documented recovery-point objective, recovery-time objective and successful quarterly restore test.

## 2. Booking and payment usefulness

### 2.1 Marketplace payments and host payouts — P0

Use a marketplace payment product rather than collecting raw card information. A Stripe Connect-style integration can take guest payments, retain Redrive’s fee, onboard hosts for payouts, issue refunds and record disputes.

Core workflow:

1. Create a server-calculated quote with an expiry time.
2. Authorise or collect payment when the booking reaches the chosen stage.
3. Store provider IDs and webhook events, never card numbers.
4. Make every webhook idempotent so retries cannot charge twice.
5. Release host payout based on the documented trip policy.
6. Reconcile booking, refund, fee and payout totals in admin.

Important: payment, insurance, tax, deposit, refund and marketplace-liability decisions require Australian legal and accounting advice before launch.

### 2.2 Quote snapshots and price guarantees — P0

Store an immutable snapshot of the daily rate, number of days, cleaning fee, protection, service fee, Redrive fee, discounts and total when a request is submitted. Later listing edits must not rewrite an existing booking’s financial history.

Show one “Total in AUD” early, with an expandable explanation instead of surprising users at the final step.

### 2.3 Availability calendar and iCalendar sync — P0

Add host-blocked dates, maintenance blocks, minimum notice, minimum/maximum trip length, pickup hours and preparation buffers. Import/export iCalendar feeds so hosts can coordinate other calendars.

Use database-level overlap protection or a transaction-safe booking lock; UI-disabled dates alone do not prevent simultaneous requests.

### 2.4 Instant Book with safety rules — P1

Let a host opt in to automatic acceptance only when the guest and trip match explicit rules:

- Email, phone and licence requirements complete
- Minimum review/history threshold chosen by the host
- Dates genuinely available
- Trip length and notice window satisfied
- No unresolved payment or safety restrictions

Always show why a request qualified or did not qualify. Avoid opaque scoring that users cannot correct.

### 2.5 Booking modification workflow — P1

Allow a guest to propose new dates, times or approved drivers without cancelling the whole trip. Recalculate price on the server, show the old and new terms side by side, then require the other party to accept.

Store every accepted version so support can reconstruct the agreement.

### 2.6 Self-service cancellation and refunds — P0

Turn cancellation guidance into an actual state machine. Before confirmation, show:

- Refund amount and destination
- Fees retained or returned
- Host payout effect
- Cancellation reason
- Effective date and policy version

Create a cancellation receipt and notify both sides. Admin overrides must require a reason and enter the audit log.

## 3. Pickup, return and safety

### 3.1 Guided digital handover — P0

Build a mobile-first inspection that both parties complete at pickup and return:

- Timestamped exterior photo angles
- Interior and equipment photos
- Existing-damage annotations on a vehicle diagram
- Odometer, fuel or battery level
- Registration and visible warning-light confirmation
- Included keys, cables and accessories checklist
- Guest and host acknowledgement

After submission, lock the report and issue a shared PDF/HTML receipt. Allow additions only as new timestamped events, never silent edits.

### 3.2 Photo alignment and before/after comparison — P1

Overlay a faint guide for required camera angles. At return, show the pickup photo outline and automatically place pickup/return images side by side. Optional computer vision may highlight areas for human review, but must never automatically declare damage or liability.

### 3.3 Incident and breakdown centre — P1

Add a prominent “Report a problem” action to active trips. Branch the flow by collision, breakdown, theft, late return, cleanliness, warning light or other concern.

Capture:

- Immediate-safety confirmation and emergency guidance
- Time and approximate location
- Photos, notes, third-party and police reference details
- Whether the vehicle is driveable
- Host/support notifications
- A chronological case timeline

Do not present Redrive as emergency or roadside assistance unless a real service agreement exists.

### 3.4 Trusted-trip sharing — P2

Allow a guest to share a read-only trip page with a trusted contact. It can show vehicle summary, planned return time, host/support contact route and a user-controlled check-in status. Precise live location must be optional, time-limited and easy to stop.

### 3.5 Rego, maintenance and safety reminders — P1

Hosts already provide registration information. Add scheduled reminders for registration expiry, service intervals, tyres, safety equipment and cleaning resets. Automatically pause a listing if a mandatory document expires, while giving the host advance notice and a clear repair path.

## 4. Discovery and decision-making

### 4.1 Compare vehicles — P1

Let users compare up to three listings in a compact table covering:

- Total trip price, not only daily rate
- Seats, sleeping capacity, doors and transmission
- Fuel type/economy and estimated route fuel use
- Amenities and equipment differences
- Rating, review count and host response indicators
- Pickup suburb and distance band
- Protection/excess summary

On mobile, use a sticky attribute column and horizontally swipeable vehicle columns.

### 4.2 Real recommendations instead of mock listings — P1

Replace `SmartRecommendations.tsx` demo data with explainable ranking from real listings. Begin with deterministic rules before machine learning:

```text
availability match
+ state/suburb relevance
+ category and capacity match
+ similarity to favourites/recent views
+ rating confidence
+ host response reliability
- repeated listings
- unavailable or incomplete listings
```

Show a short reason such as “Campervans near your saved Adelaide search.” Give users controls to hide an item or reduce a recommendation type.

### 4.3 Account-synced saved searches and alerts — P1

The existing saved-search component uses browser local storage. Move signed-in searches to Prisma so they work across devices. Let users choose instant, daily or weekly alerts when:

- A matching vehicle is added
- Dates become available
- A saved listing changes price
- A similar vehicle appears nearby

Every alert needs a one-click unsubscribe and frequency control.

### 4.4 Flexible dates and nearby-suburb expansion — P1

Offer “±1 day”, “weekend”, “any week in month” and a user-controlled nearby radius. Clearly label expanded results so the search never silently ignores the requested location or dates.

### 4.5 Search quality and typo tolerance — P1

Support misspelled makes/models, amenity synonyms and natural phrases such as “campervan sleeps four near Adelaide.” Start with indexed normalized fields and curated synonyms. Only add an AI parser after deterministic filters and analytics show a real need.

### 4.6 Listing completeness and photo-quality coach — P1

Give hosts a live completeness score based on useful evidence, not arbitrary form filling. Detect low resolution, duplicate photos, missing exterior/interior angles and images containing likely personal documents. Suggest improvements before publishing.

## 5. Australian trip innovation

### 5.1 Trip Fit Score — P2

Let a guest enter a destination or route, then explain how well a listing fits:

- Passenger, luggage and sleeping capacity
- Estimated distance and driving time
- Fuel/energy estimate using the listing’s economy data
- Tolls where supported
- Large-vehicle constraints for eligible vehicle types
- Host-declared road or geographic restrictions

The result must explain each factor and remain advisory. It must not promise that a road, weather condition or vehicle is safe.

### 5.2 Range and charging planner — P2

For EVs, add battery capacity, connector type, practical range and charging cable fields. For combustion vehicles, show conservative fuel-stop planning. Cache the itinerary for the active trip and let users update assumptions.

### 5.3 Road-condition and weather preparation cards — P2

Near departure, show links and summaries from authoritative state road and weather sources relevant to the route. Keep warnings timestamped and link to the official source. Do not scrape unofficial travel blogs for safety-critical advice.

### 5.4 Adventure equipment bundles — P2

Allow hosts to offer clearly priced optional kits—child seat, camping chairs, linen, roof box or recovery gear. Track quantity, condition and return in the handover checklist. Do not bundle regulated or safety-critical equipment without an appropriate inspection policy.

### 5.5 Collaborative trip board — P3

Guests can invite travel companions to a read-only or planning role. The group can shortlist vehicles, vote, collect questions and share an itinerary, while only the booking owner can submit payment, identity or cancellation actions.

## 6. Host tools

### 6.1 Host performance dashboard — P1

Provide each host with metrics for their own listings only:

- Booked days and utilisation
- Gross earnings, fees, refunds and expected payouts
- Enquiry-to-booking and acceptance rates
- Average response time
- Repeat guests
- Rating themes and listing views-to-request funnel

Use plain explanations and date filters. Never expose another host’s private performance data.

### 6.2 Pricing suggestions with host control — P2

Suggest—not automatically impose—rates based on the host’s historical demand, day of week, season, lead time and comparable category/location ranges. Show the evidence and expected trade-off between occupancy and daily value.

### 6.3 Message templates and scheduled instructions — P1

Let hosts save replies for common questions and schedule pickup instructions after acceptance. Templates must remain editable before sending. Never include the precise vehicle address in a public or pre-acceptance message.

### 6.4 Fleet workspace — P2

For multi-vehicle hosts, add a calendar grid, bulk availability blocks, document-expiry overview, reusable listing details and per-vehicle staff permissions. Keep this behind a fleet feature flag so the ordinary host experience stays simple.

## 7. Support and administration

### 7.1 Verification review queue — P1

Add an admin queue ordered by age and risk with side-by-side document/profile details, approve/reject reasons, second-review escalation and full audit events. Blur sensitive fields until the reviewer intentionally reveals them.

### 7.2 Unified support case — P1

Convert support conversations into cases connected to user, listing, reservation, messages, evidence and admin actions. Give users a reference number, status, last update and expected next step.

### 7.3 Marketplace health and anomaly signals — P1

Extend admin analytics with actionable signals:

- Repeated failed logins or OTP requests
- Many accounts sharing device/payment indicators
- Sudden listing-price changes before accepted bookings
- Unusual cancellation/refund clusters
- Duplicate registration numbers or reused listing photos
- Expired credentials attached to upcoming trips

Signals should open a human review, not automatically punish a user.

### 7.4 Feature flags and controlled rollout — P1

Add server-evaluated feature flags for staff, percentage cohorts and selected accounts. Record flag changes and define a rollback path. This is especially important for payments, pricing, verification and booking state changes.

### 7.5 Help Centre feedback loop — P2

Add “Was this helpful?”, failed-search analytics and a contact-support escalation. Use unanswered search phrases to decide which help articles to write next. Do not send personal search text to analytics without disclosure and filtering.

## 8. Ease-of-use and visual polish

### 8.1 One trip timeline everywhere — P1

Replace scattered status labels with a consistent timeline:

```text
Requested → Accepted → Payment ready → Pickup due → Active → Return due → Completed
```

Show the next required action, owner of that action and deadline. Use the same terminology in Trips, Reservations, Messages, notifications and admin.

### 8.2 Map/list split view — P2

On larger screens, provide a synchronized results list and privacy-safe suburb map. Hovering or focusing a card highlights only its approximate area. Mobile keeps the list primary with an explicit “Map” toggle.

### 8.3 Mobile action dock — P1

On long listing and active-trip pages, keep the primary action reachable in a safe-area-aware bottom dock. Change it contextually from “Check availability” to “Complete licence,” “Message host,” “Start pickup” or “Report a problem.”

### 8.4 Better empty, error and recovery states — P1

Every empty state should explain what happened and provide one useful action. Preserve completed form data after recoverable network errors. Add retry controls to maps, image uploads, chat and analytics instead of requiring a full page reload.

### 8.5 Motion with restraint — P2

Use short transitions for booking-state changes, saved hearts, successful handover steps and chart updates. Respect `prefers-reduced-motion`, avoid autoplaying decorative animation and never delay a task to show an animation.

### 8.6 WCAG 2.2 accessibility pass — P0

Audit keyboard order, visible focus, focus not hidden by sticky navigation, minimum target sizes, accessible authentication, error summaries and repeated-entry reduction. Test at 200% zoom, with screen readers and using keyboard-only navigation.

### 8.7 Installable offline trip companion — P2

Add a manifest and carefully scoped service worker. Cache only non-sensitive static assets and a user-requested active-trip pack containing booking summary, vehicle instructions, handover checklist and support contacts. Do not cache licence images, private messages, payment details or admin data.

Queue draft handover data locally when offline, visibly mark it “not submitted,” then synchronize after connectivity returns with conflict handling.

### 8.8 Design-system workshop — P2

Create a component catalogue for buttons, fields, alerts, cards, status chips, tables, dialogs and empty states. Include mobile, error, loading, long-text and keyboard examples. This prevents feature growth from producing visual inconsistency.

## 9. Privacy and user control

### 9.1 Privacy centre — P1

Give users one place to:

- Download a structured copy of their profile, listings and bookings
- Request account deletion and understand what must be retained
- Manage marketing and search-alert preferences
- See connected sign-in providers
- Review active sessions
- Understand licence-document state and retention

Deletion must account for disputes, financial records and legal retention rather than silently removing evidence needed for an active case.

### 9.2 Precise-location release controls — P0

Keep public suburb-level maps. Add a server-controlled rule for when an exact pickup location becomes visible—such as after acceptance or payment—and record when it was revealed. Let hosts use a dedicated handover location rather than their home address.

### 9.3 Data minimisation review — P1

For every stored field, document purpose, access roles, retention and deletion behaviour. In particular, confirm whether hobbies, dream destinations, date of birth and precise address are necessary at initial signup or can be requested only when needed.

## 10. Suggested delivery sequence

### First 30 days: reduce risk and confusion

1. Add per-account and per-IP rate limits to authentication and verification.
2. Implement password reset and security-event emails.
3. Add security headers in report-only/testing mode.
4. Define the canonical booking state machine and terminology.
5. Design the immutable quote and handover data models.
6. Replace misleading README claims with verified current capabilities.

### Days 31–90: complete the core trip

1. Build availability blocks and preparation buffers.
2. Build guided pickup/return reports with locked evidence.
3. Build self-service cancellation with a previewed outcome.
4. Add verification review queue and audit events.
5. Move saved searches from local storage to user accounts and add alerts.
6. Replace mock recommendations with real, explainable ranking.

### Months 3–6: transact and operate

1. Choose the marketplace legal/payment model.
2. Integrate provider-hosted payments, connected host onboarding and webhooks in sandbox mode.
3. Add refund, payout and reconciliation views.
4. Launch host performance analytics.
5. Launch support cases and structured incidents.

### Months 6–12: differentiate Redrive

1. Trip Fit Score and route-based cost estimates.
2. EV range and charging planning.
3. Offline active-trip companion.
4. Fleet workspace.
5. Collaborative trip boards and equipment bundles.

## 11. Suggested data-model additions

The exact schema should be designed feature by feature; avoid adding every collection at once.

| Model | Main purpose |
|---|---|
| `AvailabilityBlock` | Host, maintenance and external-calendar blocks |
| `BookingQuote` | Immutable fee and policy snapshot |
| `PaymentRecord` | Provider references, amount, currency and state |
| `PayoutRecord` | Host payout and reconciliation state |
| `BookingChange` | Proposed and accepted reservation versions |
| `HandoverReport` | Pickup/return readings, checklist and acknowledgements |
| `HandoverMedia` | Private timestamped evidence and upload status |
| `IncidentCase` | Structured safety/dispute timeline |
| `SupportCase` | User support workflow and ownership |
| `AuditEvent` | Append-only sensitive-action record |
| `SavedSearch` | Cross-device filters and alert settings |
| `WebAuthnCredential` | Passkey public credential material |
| `UserSession` | Revocable device/session history |
| `FeatureFlag` | Controlled rollout and rollback |
| `MaintenanceRecord` | Vehicle service and expiry reminders |

## 12. Product measurement

Add privacy-conscious event analytics for funnels, not surveillance. Useful measures include:

- Search → listing view → booking request conversion
- Percentage of searches returning no results
- Time from signup to profile/booking readiness
- Request acceptance and cancellation rates
- Time to host response
- Pickup/return report completion
- Support cases per 100 completed trips
- Repeat guest and repeat host rates
- Listing utilisation and expired-document downtime
- Accessibility errors found and resolved
- Authentication abuse blocked versus legitimate users challenged

Define the question and retention period before collecting an event. Avoid sending addresses, licence data, message contents, passwords, OTPs or full query strings to analytics.

## 13. Ideas to avoid or delay

- **Blockchain identity:** adds complexity without solving the current verification and audit gaps.
- **Fully automatic damage decisions:** image comparison can assist a reviewer but should not assign liability.
- **Opaque AI pricing or risk scores:** users need understandable factors, correction paths and human review.
- **Always-on precise tracking:** disproportionate privacy risk; use explicit, time-limited sharing if introduced.
- **Building custom card storage:** use provider-hosted payment components and tokens.
- **Autoplay-heavy visual effects:** harm performance, accessibility and task completion.
- **Launching boats, road vehicles and other regulated categories under identical rules:** eligibility, licensing, safety and protection terms may differ materially.

## 14. Reference standards and implementation reading

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Credential Stuffing Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [OWASP Bot Management and Anti-Automation](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Australian Cyber Security Centre small-business guide](https://www.cyber.gov.au/business-government/small-business-cyber-security/small-business-hub/small-business-cyber-security-guide)
- [Stripe Connect marketplace documentation](https://docs.stripe.com/connect)
- [Google Maps Routes API](https://developers.google.com/maps/documentation/routes)
- [MDN Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

These references are technical starting points, not legal, insurance, tax or financial advice. Review Australian requirements and contractual responsibilities with qualified professionals before enabling real payments, deposits, identity decisions, protection products or payouts.
