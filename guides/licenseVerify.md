# Australian driver licence verification guide

> **Repository status (20 August 2026):** Redrive now implements the non-government first stage described in this guide. The Profile flow captures both sides, uses Google Cloud Vision for OCR, applies local Australian-document rules, checks printed expiry, compares name/date of birth with the account, encrypts document numbers, and requires a checked/current status for booking. It deliberately does not claim government-source, authenticity, holder, class, suspension or entitlement verification. DVS remains a future phase.

## Purpose

Redrive should answer four separate questions when a user submits a licence:

1. **Is the upload an Australian driver licence?**
2. **What details are printed on it?** — name, date of birth, expiry date, issuing state, licence number and card number.
3. **Do those details match the user's Redrive profile and the issuing authority's record?**
4. **Is the user currently allowed to drive the booked vehicle?**

These are not the same check. OCR can read text but cannot prove that a document is genuine. A government record match can establish that supplied biographic details match an issuer record, but it does not prove that the uploader is the person pictured. It also must not be treated as a universal check of current driving entitlement, licence class, restrictions, suspension or disqualification.

The recommended production approach is therefore a layered workflow:

```text
front/back capture
    -> safe-file validation
    -> Australian licence classification
    -> OCR and user confirmation
    -> profile/name/expiry rules
    -> authorised government-record check
    -> automatic decision or manual review
    -> delete source images when no longer needed
```

> This is engineering and product guidance, not legal advice. Driver licence images and numbers are high-risk personal information. Obtain Australian privacy advice and approval from the chosen verification provider before production use.

## Short answer: can Redrive use government data?

Yes, but there is no public database or unrestricted government API that Redrive should scrape.

The Australian Government's **Document Verification Service (DVS)** checks whether supplied identity-document details match the issuing authority's record. For driver licences, DVS obtains data through NEVDIS. The usual result is a match/no-match response; DVS does not perform OCR or face matching. See [IDMatch: About our services](https://www.idmatch.gov.au/about-our-services) and [Austroads: NEVDIS](https://austroads.gov.au/drivers-and-vehicles/nevdis).

Redrive is a private-sector rental marketplace, so the practical route is to apply as a **DVS business user** and connect indirectly through an approved gateway service provider (GSP). IDMatch explicitly lists rental and hiring services as a business-user example. The government says business-user approval normally takes 1–2 weeks and GSP setup another 2–3 weeks, but actual provider procurement and integration can take longer. See [IDMatch: Business users](https://www.idmatch.gov.au/organisations/business-user) and the current [approved GSP list](https://www.idmatch.gov.au/organisations/business-user/approved-gateway-service-providers).

Important limits:

- DVS receives entered document details; it does not extract them from an uploaded image.
- DVS does not compare the selfie or uploader to the portrait on the card.
- A DVS match must not be Redrive's only basis for granting or refusing a service; IDMatch recommends using existing identity-proofing procedures as well.
- Do not interpret a DVS match as proof of current driving entitlement. For example, an official ATO flow states that an active, suspended or disqualified licence may be used for its DVS identity check. Printed expiry must be checked separately, and a true entitlement/status check requires a separately authorised source or user-supplied official driving record. See [myID's required driver-licence fields and jurisdiction limitations](https://www.myid.gov.au/verifying-your-id-in-myid) and the [ATO identity-document guidance](https://www.ato.gov.au/api/public/content/0-30b26b63-686e-4336-846d-e7a1896d7e60).
- Access requires an applicable privacy regime, a permitted purpose for government-related identifiers, informed express consent, access controls, logging, annual compliance reporting and possible independent audit. See the March 2026 [DVS Access Policy](https://www.ag.gov.au/sites/default/files/2026-05/document-verification-service-access-policy.pdf), [private-sector consent guidance](https://www.idmatch.gov.au/guidance-users/consent-obligations-private-sector-users) and [compliance reporting requirements](https://www.idmatch.gov.au/guidance-users/compliance-reporting).

As of the sources reviewed on 20 August 2026, the government's base DVS transaction fee for a non-government request is $0.40 excluding GST, but a GSP sets its own commercial price and may charge setup, subscription, OCR, document-authenticity and biometric fees. Confirm current pricing rather than using that figure in a business forecast. See [Identity Verification Services fees](https://www.idmatch.gov.au/organisations/identity-verification-services-fees).

## Recommended product decision

For production, procure an approved provider that can supply these capabilities under one agreement or coordinated services:

- guided capture of the front and back of an Australian physical driver licence;
- Australian document classification and template/version coverage;
- OCR for the relevant fields;
- document-quality and tamper/authenticity signals;
- authorised DVS access as a business-user/GSP arrangement;
- signed webhooks, idempotency, Australian-region/data-residency options and a defined deletion policy; and
- optionally, explicit-consent selfie liveness and face comparison.

Do not choose a vendor merely because it says “OCR” or “KYC”. Confirm in writing that its Australian driver-licence flow includes DVS access, how the result may be represented to Redrive and users, which Australian jurisdictions/card versions it supports, where images are processed, what it retains, and whether subcontractors or overseas recipients are involved.

Use the government-maintained GSP list as the procurement starting point. Examples on that list currently include FrankieOne, GBG/greenID, IDVerse, Scantek, Equifax and others; this is not an endorsement or a recommendation to hard-code against any one vendor.

For a limited pilot before a provider contract is ready, use classification/OCR plus trained manual review, and label the result **“Licence manually reviewed”**. Do not claim “government verified” or “identity verified”. A human looking at an image still cannot conclusively authenticate it.

## Terminology: licence number, card number and “client number”

The database should not have one ambiguous `clientNumber` field.

Store these as distinct concepts:

| Field | Meaning | Persistence recommendation |
|---|---|---|
| `licenseNumber` | The enduring licence/customer identifier printed by the issuer. Queensland calls its licence number a Customer Reference Number (CRN). | Encrypt if Redrive has a documented need to retain it; also keep only a masked suffix for support display. |
| `cardNumber` | Identifies the particular physical card and normally changes when a card is replaced. It is separate from the licence number. | Send to the authorised verifier, then delete unless the approved purpose and agreement require retention. |
| `providerReferenceId` | The provider's transaction/audit reference. | Retain according to the agreement; this is preferable to retaining document images. |
| `verificationId` | Redrive's own random ID for a verification attempt. | Safe to use as Redrive's internal identifier. |

Both licence number and card number are required in common DVS flows. Their positions differ by jurisdiction and sometimes the card number is on the back, which is why Redrive should capture both sides. The official [Service NSW document examples](https://www.service.nsw.gov.au/verifying-your-identity/document-examples) show fields for all jurisdictions. Queensland confirms that its CRN is marked as the licence number on the card: [Queensland CRN guide](https://www.qld.gov.au/transport/crn).

Never use a government-issued licence/CRN as Redrive's user ID, public URL, analytics key or login credential. APP 9 restricts adoption, use and disclosure of government-related identifiers. See the [Australian Privacy Principles](https://www.oaic.gov.au/privacy/australian-privacy-principles/read-the-australian-privacy-principles).

## What exists in this repository

Redrive already has a reasonable starting point:

- `app/api/upload/route.ts` validates JPEG/PNG/WebP size, MIME type and basic signatures.
- Uploads to `redrive/licenses` use Cloudinary's `authenticated` delivery type.
- `app/api/files/license/route.ts` restricts delivery to the document owner or an administrator and creates a five-minute signed URL.
- `User` has `licenseStatus`, `licenseExpiresAt`, reviewer and rejection fields.
- `app/api/cron/security-maintenance/route.ts` marks verified licences expired.
- An administrator can currently set `VERIFIED`, `REJECTED` or `EXPIRED`.

However, the existing feature records that an image was submitted; it does not verify the image content.

### Fix these issues before adding automation

1. **Require an actually verified licence for booking.**

   `app/api/reservations/route.ts` currently blocks only `REJECTED` and `EXPIRED`; a `PENDING` upload can proceed. The server-side rule should be equivalent to:

   ```ts
   const licenceReady =
     renter.licenseStatus === "VERIFIED" &&
     renter.licenseExpiresAt instanceof Date &&
     renter.licenseExpiresAt.getTime() >= Date.now();

   if (!licenceReady) {
     return NextResponse.json(
       { error: "A verified, current Australian driver licence is required.", code: "LICENSE_NOT_VERIFIED" },
       { status: 403 },
     );
   }
   ```

   Recheck this at every safety-critical transition, including booking request, host approval if appropriate, payment/final confirmation and pickup. Never trust the React UI to enforce it.

2. **Restrict the profile API response.**

   `PUT /api/profile` currently calls `prisma.user.update()` without a `select` and returns the resulting `User` object. Select only the safe fields intended for the browser; never serialize password hashes, verification-code hashes, reset/security fields or internal licence data.

3. **Bind uploaded assets to their uploader server-side.**

   Do not accept a client-supplied `/api/files/license?asset=...` string as proof of ownership. Create an upload/verification row first, associate it with the authenticated user, and allow that user to attach only assets recorded on that row.

4. **Delete or detach the old asset on replacement/removal.**

   Clear `licensePublicId`, invalidate the old verification and schedule deletion of replaced Cloudinary assets. The current profile update only sets `licensePublicId` when a new match exists, so removing an image can leave a stale identifier.

5. **Separate driver licences from other licence types.**

   The current UI offers `Driver License`, `Boat License` and `Other License`. Only a verified Australian driver licence should satisfy vehicle-booking readiness. Use a fixed internal enum such as `AU_DRIVER_LICENCE`; do not trust the selected label.

6. **Capture front and back without destructive transformations.**

   The current upload stores one image and applies size/quality transformation. Keep an authenticated original for the short verification window and create a separate derived preview. Providers may need the unmodified image and the card number may be on the back.

## Proposed user experience

### 1. Explain the check before capture

Show a short collection notice before any upload:

- why Redrive needs a current driver licence;
- the fields and images that will be collected;
- that an approved third-party system and document issuer/official record holder will receive relevant details;
- what happens if consent is refused (browsing remains available, driving/booking does not);
- retention/deletion periods;
- overseas processing, if any;
- how to access/correct information or complain; and
- a link to Redrive's privacy policy.

The DVS participation terms require informed **express** consent. Use an unticked checkbox and record the exact notice version, timestamp and authenticated user. Do not infer consent from upload or use a pre-ticked/opt-out box.

The provider must approve the final wording. Current IDMatch guidance says the user-facing notice may describe a “third-party system” but must not directly name DVS. Its model wording is available on the [private-sector consent page](https://www.idmatch.gov.au/guidance-users/consent-obligations-private-sector-users). Do not copy generic consent from another company.

### 2. Guided front and back capture

Accept a live camera capture or image chosen by the user, but guide them to:

- place the physical card alone on a plain background;
- include all four edges;
- avoid glare, fingers and blur;
- capture the front and then the back;
- avoid screenshots, photocopies, PDFs and photos of a phone-displayed digital licence in the initial release; and
- retake immediately when local blur/glare/crop checks fail.

Use `capture="environment"` on mobile as a convenience, not as a security guarantee. An upload from a photo library must receive the same checks.

### 3. Classify before extracting

The document-analysis response should provide at least:

```ts
type DocumentAnalysis = {
  documentType: "AU_DRIVER_LICENCE" | "OTHER" | "UNKNOWN";
  issuingState: "ACT" | "NSW" | "NT" | "QLD" | "SA" | "TAS" | "VIC" | "WA" | null;
  frontBack: { front: boolean; back: boolean };
  quality: { blur: number; glare: number; cropped: boolean };
  classificationConfidence: number;
  authenticitySignals: Array<{ code: string; outcome: "PASS" | "FAIL" | "UNKNOWN" }>;
  fields: {
    givenNames: { value: string; confidence: number } | null;
    familyName: { value: string; confidence: number } | null;
    dateOfBirth: { value: string; confidence: number } | null;
    expiryDate: { value: string; confidence: number } | null;
    licenceNumber: { value: string; confidence: number } | null;
    cardNumber: { value: string; confidence: number } | null;
    licenceClass: { value: string; confidence: number } | null;
  };
};
```

Reject `OTHER`; ask for a retake on `UNKNOWN`, missing edges, wrong side, unreadable fields or low confidence. Do not send obviously unrelated uploads to a paid government check.

Do not rely on a single hard-coded visual template. Australia has eight issuers and multiple valid card versions. Template updates belong in the provider integration or a versioned rules package, not scattered React regular expressions.

### 4. Let the user confirm extracted fields

Show the extracted name, date of birth, expiry, issuing state, licence number and card number in editable fields. Mask the numbers after confirmation. Never silently “correct” OCR and then submit the changed value without confirmation.

Use the values printed on the licence for the government-record request. Separately compare them with the user's Redrive profile:

- family name should match after safe case/whitespace/punctuation normalisation;
- given names may need a documented rule for middle names, preferred names and order;
- date of birth should match exactly;
- expiry must be a real calendar date and must not be in the past in the business timezone;
- issuing state must be one of the eight jurisdictions; and
- required licence/card-number syntax should use the selected provider's current rules.

A profile mismatch should normally go to `NEEDS_REVIEW` or ask the user to correct the profile; it should not automatically label the document fraudulent. Preserve Unicode in the canonical value even if a separate comparison form is normalised.

### 5. Run the authoritative match

After explicit consent, the server sends the confirmed fields to the authorised provider. A typical driver-licence match uses:

- issuing state/territory;
- licence number;
- card number;
- given name(s);
- family name; and
- date of birth.

Confirm the exact schema with the selected GSP. Do not call DVS from the browser, expose provider secrets, log payloads or include numbers in URLs.

Treat responses as three categories, not a boolean:

- **match** — continue through Redrive's other rules;
- **no match** — allow one careful correction, then manual review/rejection under provider rules; and
- **system/provider error** — keep the attempt pending and retry safely; never reject the user because an issuer or provider is unavailable.

Use idempotency keys and a strict per-user/IP attempt limit. Do not let an attacker enumerate name, date or document-number variations against government records.

### 6. Make a policy decision

Suggested automatic outcomes:

| Conditions | Outcome |
|---|---|
| Australian driver licence classified; required fields high-confidence and user-confirmed; profile name/DOB acceptable; printed expiry current; authoritative match successful; no strong tamper/duplicate signal | `VERIFIED` |
| Poor quality, uncertain classifier, low-confidence critical field, legitimate name variation or provider result needing interpretation | `NEEDS_REVIEW` |
| Not an Australian driver licence, expired, authoritative no-match after correction, unsupported document, or confirmed tamper signal | `REJECTED` or `EXPIRED` with a non-accusatory reason |
| Provider timeout/outage | `PROVIDER_ERROR`, then queued retry |

If the provider is an identity service provider rather than Redrive acting as the direct DVS business user, the contract may permit Redrive to receive only an **identity opinion**, not the underlying information match result. Model the adapter around the outcome Redrive is legally authorised to receive. IDMatch distinguishes these in its [identity opinions guidance](https://www.idmatch.gov.au/guidance-users/identity-opinions).

### 7. Optional holder binding

A stolen genuine card may pass document and government-record checks. Higher assurance requires a separately consented selfie-liveness and face-comparison step or an in-person check.

If Redrive adds this:

- use a specialist provider rather than building face recognition;
- obtain specific, freely given consent;
- provide a manual alternative;
- test performance and accessibility across demographic groups;
- do not retain a biometric template unless essential; and
- complete a privacy impact assessment first.

Biometric information used for automated verification is sensitive information under Australian privacy guidance. See [OAIC: What is personal information?](https://www.oaic.gov.au/privacy/your-privacy-rights/your-personal-information/what-is-personal-information) and [APP 3 collection guidance](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information).

## Data model

Do not continue adding every field directly to `User`. A separate record provides attempt history, auditability and safer response selection.

An illustrative Prisma/MongoDB model is below. Adapt names to the chosen provider and use enums if desired.

```prisma
model LicenseVerification {
  id                       String   @id @default(auto()) @map("_id") @db.ObjectId
  userId                   String   @db.ObjectId
  status                   String   @default("UPLOADED")
  documentType             String?
  issuingState             String?

  // Application-layer envelope encryption; never return these in normal APIs.
  licenseNumberCiphertext  String?
  licenseNumberLast4       String?
  licenseNumberHmac        String?
  licenseNumberHmacVersion String?
  cardNumberCiphertext     String?
  cardNumberLast4          String?

  verifiedGivenNames       String?
  verifiedFamilyName       String?
  verifiedDateOfBirth      DateTime?
  expiresAt                DateTime?
  licenceClass             String?

  frontAssetPublicId       String?
  backAssetPublicId        String?
  rawAssetsDeleteAfter     DateTime?
  rawAssetsDeletedAt       DateTime?

  classificationConfidence Float?
  ocrSummary               Json?    // confidence/reason codes, not raw provider payload
  provider                 String?
  providerReferenceId      String?
  providerOutcome          String?  // only what Redrive is authorised to receive
  reasonCodes              String[] @default([])

  consentVersion           String?
  consentedAt              DateTime?
  checkedAt                DateTime?
  decidedAt                DateTime?
  reviewedBy               String?  @db.ObjectId
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([licenseNumberHmac])
  @@index([status, createdAt])
  @@index([rawAssetsDeleteAfter, rawAssetsDeletedAt])
  @@index([expiresAt, status])
}
```

Add the inverse relation to `User` and, during migration, optionally retain a denormalised `currentLicenseVerificationId`, `licenseStatus` and `licenseExpiresAt` for fast booking checks. The verification record is the source of truth.

### Protecting the numbers

- Use envelope encryption backed by a cloud KMS for any number that must be recovered for an authorised operation.
- Keep encryption keys outside MongoDB and Cloudinary. Rotate keys and store a key version with ciphertext.
- For duplicate detection, store an HMAC of a canonical value such as `AU_DL|STATE|LICENCE_NUMBER`, using a dedicated rotating pepper. Do not use plain SHA-256; licence-number spaces are small enough to guess.
- Show only masked values, for example `•••• 1234`, to users and support staff.
- Prefer deleting card-number ciphertext immediately after the verification transaction.
- Do not include raw fields or provider payloads in analytics, error monitoring, audit descriptions or notifications.

## API and service layout

Keep provider-specific code behind narrow server-only interfaces:

```ts
export interface LicenseDocumentAnalyzer {
  analyze(input: { frontAssetId: string; backAssetId: string }): Promise<DocumentAnalysis>;
}

export interface GovernmentDocumentVerifier {
  verify(input: {
    jurisdiction: string;
    licenceNumber: string;
    cardNumber: string;
    givenNames: string;
    familyName: string;
    dateOfBirth: string;
    consentEvidenceId: string;
    idempotencyKey: string;
  }): Promise<{
    outcome: "MATCH" | "NO_MATCH" | "ERROR";
    referenceId?: string;
    reasonCode?: string;
  }>;
}
```

Only the adapter should know the provider's terminology. If Redrive is entitled to an identity opinion rather than a raw match result, change the adapter return type to that permitted opinion.

Suggested endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/license-verifications` | Authenticate, rate-limit, create the attempt and return upload instructions. |
| `POST /api/license-verifications/:id/images` | Receive front/back images, bind them to that user/attempt and enqueue analysis. |
| `GET /api/license-verifications/:id` | Return safe status, masked fields and user-action reason codes. |
| `PATCH /api/license-verifications/:id/fields` | Save user-confirmed OCR corrections. |
| `POST /api/license-verifications/:id/consent` | Record versioned express consent and enqueue the authoritative check. |
| `POST /api/webhooks/license-provider` | Verify provider signature, deduplicate events and apply allowed state transitions. |
| `PATCH /api/admin/license-verifications/:id` | Authorised manual review with reason and audit event. |

Do not make long OCR/provider calls part of `PUT /api/profile`. Verification should have its own state machine and retryable worker/webhook flow. If a job system is not yet available, use a short server request for the first provider integration but keep the interface asynchronous so it can move to a queue without changing the UI.

### State transitions

```text
NOT_SUBMITTED
  -> UPLOADED
  -> PROCESSING_DOCUMENT
  -> NEEDS_INPUT | READY_FOR_CONSENT | NEEDS_REVIEW | REJECTED
  -> CHECKING_SOURCE
  -> VERIFIED | NEEDS_REVIEW | REJECTED | PROVIDER_ERROR
  -> EXPIRED
```

Make transitions server-owned and transactional. A client may request an action but must never set `VERIFIED`, `checkedAt`, `providerOutcome` or `expiresAt` directly.

## Upload and image security

Keep the current size/MIME/signature checks and add:

- dedicated licence routes rather than a client-selected folder on the generic uploader;
- full image decoding to reject corrupt files and decompression/pixel bombs;
- conservative dimension/aspect-ratio limits;
- malware scanning where supported;
- random provider-neutral asset IDs;
- authenticated/private storage with no public transformations;
- `Cache-Control: private, no-store` for every response containing an image or extracted value;
- no licence images in Next.js image optimisation caches;
- EXIF/location stripping on derived previews;
- strict owner/reviewer authorisation and audit logging for every admin view;
- deletion of partial/abandoned uploads; and
- provider URLs created server-side with the shortest useful lifetime.

Do not use licence images in development fixtures copied from real users. Use synthetic cards that are visibly marked `TEST / NOT A REAL LICENCE`, and never send those to DVS.

## Privacy and retention

The minimum-data design is to retain a decision, provider transaction reference, masked number suffix, verified name/DOB/expiry needed for the booking purpose and audit metadata — not the source images and full card details indefinitely.

Suggested policy for legal/provider review:

- abandoned uploads: delete within 24 hours;
- source front/back images: delete shortly after a final decision, for example within 72 hours or a narrowly justified manual-review window;
- card number: delete immediately after verification unless the participation agreement requires otherwise;
- full licence number: retain encrypted only if Redrive can document why it is reasonably necessary; otherwise retain a masked suffix and provider reference;
- failed attempt details: retain only reason codes and audit metadata for a defined fraud/support window;
- verification result: retain only for the account/booking lifecycle plus the legally approved disputes period; and
- account deletion: destroy/de-identify unless a specific legal hold applies.

These durations are product proposals, not statements of Australian law. Document the final schedule in the privacy policy and processing inventory, enforce it with a daily deletion job, and test that Cloudinary/provider backups follow the contract.

OAIC guidance requires collection to be reasonably necessary, protection against misuse/loss/unauthorised access, and destruction or de-identification when information is no longer needed. APP 8 also matters when a provider or subprocessor receives information overseas. See the [APP guidelines](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines) and [IDMatch advice to businesses](https://www.idmatch.gov.au/protect-your-identity/for-businesses).

Complete a privacy impact assessment and a data-breach response plan before launch. A licence number plus card number can enable identity fraud, so the incident runbook should cover containment, provider notification, legal assessment and user instructions for card replacement. See [OAIC data-breach preparation](https://www.oaic.gov.au/privacy/notifiable-data-breaches/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response/part-1-data-breaches-and-the-australian-privacy-act).

## Licence status, class and vehicle eligibility

Redrive's badge and copy must match what was actually checked:

- **“Licence details checked”** — document fields matched the authorised source and local rules passed.
- **“Holder check completed”** — only if a separately consented holder-binding check passed.
- **“Eligible for this vehicle class”** — only after class and current entitlement have been verified using an authorised source or acceptable official evidence.

Do not display “Valid driver” merely from OCR plus DVS. For cars, motorcycles, heavy vehicles and some towing scenarios, Redrive may need class/condition/entitlement evidence beyond identity-document verification. Treat that as a second integration and obtain legal/insurance advice on the booking-time requirements.

At minimum:

- store the printed expiry date from a verified attempt;
- treat the printed expiry as a date-only value and mark it `EXPIRED` after the end of that day in the issuing jurisdiction (never accidentally at the start of the day because of UTC conversion);
- notify the user 30 and 7 days before expiry;
- require fresh verification after replacement, renewal or relevant profile-name/DOB change; and
- recheck booking readiness again near pickup.

## Manual review

Manual review is for uncertainty, not a bypass around a failed government check.

The admin screen should show only what is necessary:

- front/back image behind step-up admin authentication;
- masked licence and card number by default;
- extracted fields and confidence values;
- profile differences;
- provider-authorised outcome/opinion and reference;
- structured reason codes; and
- image retention deadline.

Require a reason for every decision. Record reviewer, timestamp and previous/new state in `AuditEvent`. Prevent the reviewer from downloading the original unless their role explicitly requires it. Do not email licence images or paste numbers into support tickets.

User-facing rejection messages should be specific enough to recover without exposing fraud rules:

- “This does not appear to be an Australian driver licence.”
- “We could not read the card number. Please photograph the back again.”
- “The name differs from your Redrive profile. Review your legal name or contact support.”
- “This licence has expired.”
- “We could not confirm these details. Check them once or request manual review.”
- “The verification service is temporarily unavailable; we will retry.”

Provide a correction/review path and never accuse a user of forgery based only on an automated signal.

## Test plan

### Unit tests

- status-transition table, including illegal client-driven transitions;
- current-expiry boundary in `Australia/Adelaide` and UTC storage;
- name comparison for spaces, hyphens, apostrophes, middle names and Unicode;
- licence-number masking, encryption round trip and HMAC canonicalisation;
- provider result mapping, especially `ERROR` versus `NO_MATCH`;
- booking-readiness predicate permits only `VERIFIED` and unexpired; and
- safe serializers never include ciphertext, HMAC, raw OCR/provider payload or asset IDs.

### Integration tests

- unauthenticated upload and cross-user asset access fail;
- a user cannot attach another user's asset;
- front-only submission stays incomplete when the back is required;
- selfie, passport, proof-of-age card, utility bill and foreign licence are rejected as the wrong type;
- blurry, cropped and glare-heavy images request a retake;
- an expired Australian licence becomes `EXPIRED` even if identity details otherwise match;
- a profile name/DOB mismatch goes to the intended correction/review path;
- authoritative no-match does not become verified;
- provider outage remains retryable and does not reject;
- duplicate webhook events do not duplicate decisions or charges;
- old card/image is invalidated after replacement;
- duplicate licence HMAC across two accounts triggers private fraud review; and
- replacing/removing a licence schedules old assets for deletion.

### Security and operational tests

- provider webhook signature/replay tests;
- per-user and per-IP attempt limits;
- logs, traces, analytics and error reports contain no document values;
- signed image URLs expire and are non-cacheable;
- admin access is audited and least-privileged;
- encryption-key rotation and recovery drill;
- deletion job verified against Cloudinary and provider retention;
- backup/restore does not restore already-expired raw documents indefinitely; and
- data-breach tabletop exercise for exposed licence/card numbers.

Use the provider's sandbox only with provider-approved synthetic values. A “match” in a mocked test must never set production verification state.

## Delivery plan

### Phase 0 — close current gaps

- Change booking readiness to require `VERIFIED` plus current expiry.
- Restrict `PUT /api/profile` to a safe response projection.
- Split `AU_DRIVER_LICENCE` from boat/other documents.
- Bind uploads to user-owned verification attempts and clean up replaced assets.
- Add front/back capture and explicit versioned consent UI.

### Phase 1 — pilot without a government claim

- Add document classifier/OCR through the provider abstraction.
- Add quality checks, field confirmation and profile comparison.
- Build the state machine, admin review queue, audit trail and retention job.
- Display `Manually reviewed`, not `Government verified`.

### Phase 2 — authorised DVS integration

- Shortlist approved GSPs and complete privacy, security, data-residency, accessibility, SLA and cost review.
- Establish and document why DVS use is reasonably necessary for Redrive's rental function.
- Complete the business-user application, participation agreement and approved consent/collection notice.
- Integrate provider sandbox, webhook verification, idempotency and outage handling.
- Launch behind a feature flag, initially routing uncertain cases to manual review.

### Phase 3 — stronger driver assurance

- Evaluate separately consented liveness/holder binding.
- Determine whether licence class, conditions and current entitlement must be checked for each listing category.
- Add re-verification before pickup where risk and insurance rules justify it.
- Measure false rejection, manual-review rate, completion time, provider errors and accessibility issues without logging personal document data.

## Go-live checklist

- [ ] Legal/privacy review and privacy impact assessment completed.
- [ ] DVS business-user/GSP agreement active for Redrive's stated purpose.
- [ ] Provider-approved consent and collection notice deployed with version tracking.
- [ ] Only `VERIFIED` and unexpired users can pass server-side booking gates.
- [ ] Document type, front/back, OCR, expiry, profile match and authoritative source checks are distinct.
- [ ] Licence number and card number are separate fields; neither is a Redrive identifier.
- [ ] Recoverable identifiers use KMS-backed encryption; duplicate checks use keyed HMAC.
- [ ] Raw images/card number have tested automatic deletion.
- [ ] Provider secrets and calls are server-only; webhook signatures and idempotency are tested.
- [ ] Admin access is least-privileged, step-up protected and audited.
- [ ] Outages produce pending/retry states, not rejection.
- [ ] User correction, appeal and manual alternatives are available.
- [ ] Public/user-facing wording does not overstate DVS, OCR, face or entitlement checks.
- [ ] Incident response covers exposure of both licence and card numbers.

## Recommended first implementation slice

The smallest safe slice for this repository is:

1. fix the booking and profile-response issues;
2. introduce `LicenseVerification` and a dedicated front/back upload flow;
3. add a provider-neutral classifier/OCR adapter and user-confirmed fields;
4. add explicit, versioned consent and a mock government-verifier adapter for non-production tests;
5. build manual review and deletion jobs; and
6. replace the mock only after Redrive's GSP agreement authorises production checks.

This gives Redrive useful rejection of random uploads immediately, while keeping the architecture ready for a legitimate government-record match and avoiding the dangerous claim that OCR alone “verified” an Australian licence.
