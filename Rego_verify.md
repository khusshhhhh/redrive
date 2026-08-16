# Registration verification proposal

## Purpose

When a host lists a vehicle, Redrive should establish reasonable confidence that:

1. the registration exists and is current;
2. the uploaded evidence relates to the plate and vehicle being listed;
3. the host is authorised to list the vehicle; and
4. the evidence has not been obviously altered or reused.

These are different claims. Reading `S168CBO` from an image proves only that those characters appear in the file. It does **not** prove that the vehicle is currently registered, that the document is genuine, or that the uploader owns or controls the vehicle.

The recommended approach is therefore a layered verification workflow, with automatic checks for clear cases and manual review for uncertain cases.

> This proposal is product and engineering guidance, not legal advice. Before launch, Redrive should obtain Australian privacy/legal advice and confirm the permitted use, storage and display of registration data with each registry or data provider.

## Recommended solution in one view

Use four layers:

1. **Structured user input** — state/territory, plate, VIN, expiry date, make, model and year.
2. **Private evidence upload** — registration certificate or official digital registration record, plus an optional live photo of the physical plate.
3. **Document checks** — safe-file validation, malware scanning, OCR, document classification and comparison of extracted fields with the listing.
4. **Authoritative data check** — verify registration status and vehicle attributes through an approved government or commercial provider with legitimate access to state registration/NEVDIS data.

The listing should remain unpublished or show `Verification pending` until the required checks pass. The public badge should say **Registration checked**, not **Ownership verified**, unless Redrive has separately verified authority or ownership.

## What Redrive has today

The existing implementation already captures:

- `regoNumber`, `regoEndDate` and `regoImage` in the listing flow;
- a unique `regoNumber` in the Prisma `Listing` model;
- an image upload routed through `/api/upload`; and
- registration fields in the create and edit listing APIs.

Important gaps:

- The create API substitutes `UNKNOWN` when no plate is supplied. Because `regoNumber` is unique, a second missing plate can collide with the first.
- Plate uniqueness is currently global. Australian plates should be keyed at least by issuing jurisdiction plus normalised plate, because the same text may exist in different states or territories.
- The server uppercases a plate but does not consistently remove spaces, hyphens or other formatting.
- The supplied expiry date and uploaded image are stored without verifying that their contents match the listing.
- `/api/upload` accepts only JPEG, PNG and WebP. It cannot accept a PDF registration certificate.
- Registration evidence uses the same default Cloudinary `upload` delivery type as ordinary listing images. Cloudinary states that this type is public by default; sensitive evidence should instead use authenticated/private delivery and short-lived signed access URLs. [Cloudinary upload and delivery types](https://cloudinary.com/documentation/upload_parameters), [Cloudinary media access control](https://cloudinary.com/documentation/control_access_to_media)
- The listing API must not return the full registration document URL, full VIN, or internal verification evidence in public listing responses.

## Proposed host experience

### 1. Enter vehicle registration

Ask for:

- issuing state or territory;
- registration plate;
- full 17-character VIN for vehicles that have one;
- make, model and year; and
- user-declared registration expiry date.

Normalise `S 168-CBO` to `S168CBO` for matching, while retaining the user's original display value. Do not reject a plate solely because it does not match one common state pattern: personalised, historic, motorcycle, diplomatic and other plate types vary. The selected jurisdiction should drive lightweight validation and help text.

For VINs, the official PPSR guidance describes the VIN as a unique 17-character vehicle identifier and excludes the letters I, O and Q. [PPSR VIN guidance](https://www.ppsr.gov.au/glossary/vin-vehicle-identification-number)

### 2. Explain the collection before upload

Show a short, just-in-time notice:

> We collect registration evidence to check that this vehicle is registered and matches the listing. It is not shown publicly. It may be processed by our secure storage, document-reading and vehicle-data providers. We delete the original when it is no longer required under our retention policy.

Link to a full collection notice and privacy policy. OAIC guidance says organisations should collect only personal information reasonably necessary for their activities, notify people at or before collection about the purpose and usual disclosures, protect held information, and destroy or de-identify it when no longer needed. [OAIC APP 3](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information), [OAIC APP 5](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-5-app-5-notification-of-the-collection-of-personal-information), [OAIC APP 11](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information)

### 3. Upload registration evidence

Accept one of:

- a clear photo or scan of an official registration certificate;
- a PDF registration certificate or official account export; or
- a screenshot of the user's official state registration record.

Give clear capture instructions:

- show the plate, vehicle make/model, expiry and VIN or VIN suffix where available;
- include all four document edges for a photographed certificate;
- avoid glare, blur and cropped fields;
- allow unrelated address details to be covered if they are not required for matching; and
- do not upload a driver's licence in this field.

Optionally request a second, live photo of the physical rear plate with a short one-time challenge displayed by Redrive. This raises confidence that the uploader currently has access to the vehicle, but it still does not prove legal ownership.

### 4. Review the extracted details

After OCR, show the host the extracted fields:

- plate;
- jurisdiction;
- registration status/expiry;
- make/model/year;
- VIN suffix; and
- registrant name only if strictly required for authority checking.

Let the host correct OCR mistakes, but preserve the original extraction and record corrections for review. A corrected value should not silently become a successful verification.

### 5. Show a clear outcome

Use these user-facing states:

| State | Host message | Listing behaviour |
|---|---|---|
| `DRAFT` | Finish registration details | Cannot publish |
| `PROCESSING` | Checking your registration | Save draft; cannot publish yet |
| `NEEDS_ACTION` | We could not match some details | Host can replace evidence or correct input |
| `MANUAL_REVIEW` | A team member is reviewing the document | Draft or limited visibility, based on policy |
| `VERIFIED` | Registration checked | Can publish; show a dated badge |
| `REJECTED` | Registration could not be verified | Cannot publish; provide a safe appeal path |
| `EXPIRED` | Registration check has expired | Pause new bookings until reverified |

Do not expose fraud rules or detailed rejection signals that would help attackers tune forged documents.

## Verification pipeline

### A. Secure file intake

Create a dedicated endpoint such as `POST /api/rego-verifications/upload`; do not reuse the general listing-image endpoint.

Required controls:

- require an authenticated host and verify ownership of the draft listing;
- allow only `.jpg`, `.jpeg`, `.png`, `.webp` and `.pdf`;
- validate extension, declared MIME type and binary signature independently;
- cap file size, PDF page count and image dimensions;
- reject encrypted/password-protected PDFs for the automated path;
- generate server-side object names rather than trusting filenames;
- run malware scanning before OCR or reviewer access;
- strip image metadata where it is not needed;
- store the original outside the public web path; and
- log access, replacement and deletion events.

OWASP recommends allowlisting required extensions, validating the real file type rather than trusting `Content-Type`, changing filenames, applying size limits, allowing only authorised uploaders and storing uploads away from the web root or on a separate server. [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

Cloudinary can upload PDFs as image assets and render PDF pages, but registration evidence should use the `authenticated` delivery type so originals and derivatives require signed access. Store the Cloudinary `asset_id`/`public_id`, not a permanently public `secure_url`. [Cloudinary PDF handling](https://cloudinary.com/documentation/upload_parameters#uploading_pdfs)

### B. Document classification and OCR

The processor should first classify the upload as:

- likely registration certificate/official registration record;
- physical plate photo;
- unrelated document; or
- unreadable/unsupported.

Then extract candidate fields and confidence scores. A managed OCR service is the lowest-operational-risk starting point. For example, Amazon Textract supports JPEG, PNG, PDF and TIFF inputs, subject to operation-specific size and page limits. [Amazon Textract quotas and formats](https://docs.aws.amazon.com/textract/latest/dg/limits-document.html)

OCR output should be treated as evidence, not truth. Match using normalised values and tolerate common OCR confusions (`0/O`, `1/I`, `5/S`, `8/B`) only to route a case to review—not to auto-approve a mismatch.

### C. Consistency checks

Calculate a verification score from independently useful checks:

- exact normalised plate match;
- issuing jurisdiction match;
- VIN exact match or approved suffix match;
- make/model match;
- plausible year match;
- expiry date match and not expired;
- document type confidence;
- evidence not previously used by another host/listing;
- no obvious image/PDF integrity warnings; and
- optional physical-plate challenge match.

Example decision policy:

- **Auto-verify:** authoritative lookup is current, plate + jurisdiction + VIN match, and document confidence exceeds the threshold.
- **Manual review:** registry matches but OCR is weak, the document omits a field, or make/model has a minor discrepancy.
- **Reject/needs action:** registry says cancelled/expired, VIN or jurisdiction conflicts, evidence was reused, or the file is unrelated/unsafe.

Store each rule result and provider response reference so a reviewer can understand why a decision occurred. Do not store more raw provider data than necessary.

### D. Authoritative registration check

South Australia's official services provide a vehicle registration check/expiry service, and similar services exist in other jurisdictions. These checks can help confirm status and vehicle attributes but generally do not prove that the Redrive user is the registered operator. [Service SA services](https://www.service.sa.gov.au/service_sa_transactions_and_services_list), [SA registration information](https://www.sa.gov.au/topics/driving-and-transport/registration)

For production automation, Redrive should negotiate an approved API/data-provider arrangement rather than scrape public government pages. Scraping creates reliability, rate-limit, terms-of-use and privacy risks.

NEVDIS is the national exchange used by Australian road authorities. Austroads says it supports fraud/theft prevention and provides vehicle information to public and private organisations for provenance checks, insurance and related purposes. Access should be arranged through Austroads/NEVDIS, PPSR, or an authorised commercial data provider under a contract suitable for Redrive's use case. [Austroads NEVDIS overview](https://austroads.gov.au/drivers-and-vehicles/nevdis)

If vehicle provenance matters, add an optional or mandatory VIN-based PPSR check. A PPSR result may include security interests and, depending on available NEVDIS data, stolen and written-off information. This is a separate check from registration currency and host authority. [NSW Government PPSR overview](https://www.nsw.gov.au/business-and-economy/running-a-business/industry-specific-business-requirements/working-as-a-motor-dealer/pps-register)

## Proving authority to list

A current registration check does not prove the uploader may rent out the vehicle. Choose and publish an authority policy:

1. **Registered operator match:** compare the registration record/certificate name with the verified Redrive account name.
2. **Authorised representative:** if names differ, require an authorisation declaration and supporting evidence appropriate to company, lease, family or fleet vehicles.
3. **Possession check:** optional one-time physical-plate challenge as an additional signal.
4. **Manual exception review:** record who approved the exception, why, and when it expires.

Avoid collecting a full certificate merely to retain the registrant's address. If a provider can return a yes/no name or authority match, prefer that over storing the name and address.

## Suggested data model

Move verification data out of `Listing` into a separate record so evidence, decisions and audit history are not exposed with the public listing.

```prisma
model RegoVerification {
  id                    String   @id @default(auto()) @map("_id") @db.ObjectId
  listingId             String   @db.ObjectId
  userId                String   @db.ObjectId
  jurisdiction          String
  plateDisplay          String
  plateNormalized       String
  vinEncrypted          String?
  vinLast6              String?
  declaredExpiry        DateTime?
  documentAssetId       String?
  documentSha256        String?
  documentMimeType      String?
  status                RegoVerificationStatus @default(PROCESSING)
  documentConfidence    Float?
  extractedFields       Json?
  checkResults          Json?
  provider              String?
  providerReference     String?
  verifiedAt            DateTime?
  expiresAt             DateTime?
  reviewerId            String?  @db.ObjectId
  reviewReason          String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([listingId, createdAt])
  @@index([userId, status])
  @@index([jurisdiction, plateNormalized])
}

enum RegoVerificationStatus {
  PROCESSING
  NEEDS_ACTION
  MANUAL_REVIEW
  VERIFIED
  REJECTED
  EXPIRED
}
```

Additional recommendations:

- Replace `Listing.regoNumber @unique` with a normalised jurisdiction-aware constraint or verification-level rule. Decide how to handle legitimate relisting, plate transfers and archived listings before enforcing uniqueness.
- Encrypt full VIN and registrant data at the application level with managed key rotation; expose only the VIN suffix in ordinary admin screens.
- Store an evidence hash to detect exact reuse, but restrict access to the hash and define when it is deleted.
- Add `registrationVerificationStatus`, `registrationVerifiedAt` and `registrationVerificationExpiresAt` to the public-safe listing projection only. Never expose raw OCR/provider responses.

## Suggested API and worker boundaries

```text
POST /api/rego-verifications
  Create verification for a host-owned draft listing.

POST /api/rego-verifications/:id/upload
  Validate and privately store evidence; enqueue processing.

GET /api/rego-verifications/:id
  Return host-safe status and actionable mismatches.

POST /api/admin/rego-verifications/:id/decision
  Authenticated, role-protected manual decision with audit reason.

POST /api/internal/rego-verifications/:id/process
  Worker-only OCR, matching and provider orchestration.
```

Run OCR/provider work asynchronously and make requests idempotent. Use a provider request key so retries cannot create repeated paid checks. Record provider outages separately from verification failures.

## Privacy, retention and access

- Complete a privacy impact assessment before implementation.
- Collect only fields required for the documented safety decision.
- Provide an APP 5 collection notice before upload, including third-party and overseas processing disclosures where applicable.
- Restrict evidence access to a small reviewer role with MFA and audit logs.
- Never put registration documents in analytics, error tracking, application logs or customer-support screenshots by default.
- Redact addresses and unrelated identifiers in reviewer previews where possible.
- Define deletion as code and policy. A reasonable starting proposal is to delete original evidence shortly after a final decision and appeal window (for example, 30–90 days), then retain only the minimum decision/audit metadata while the listing is active or as required for disputes and law. Legal review must set the actual periods.
- Reverify on expiry, plate/VIN change, ownership/authority change, suspicious account activity, or a defined periodic interval.
- Pause future bookings when verification expires or an authoritative check reports cancellation.

## Threats to design for

| Threat | Control |
|---|---|
| Someone uploads an unrelated registration certificate | OCR field match plus authoritative plate/VIN check |
| Edited plate or expiry in an image/PDF | Registry comparison, integrity signals and manual review |
| Valid document reused across accounts | Evidence hash, jurisdiction/plate uniqueness policy and account audit |
| Screenshot of another person's vehicle | Account-name/authority check plus optional physical-plate challenge |
| Malicious PDF or disguised executable | Signature validation, parser isolation, malware scan and no public execution path |
| Guessable public document URL | Authenticated/private storage and short-lived signed access |
| Reviewer abuse or accidental disclosure | Least privilege, MFA, redaction and immutable access logs |
| Registry/provider outage | Retry with backoff; show `Processing`, never convert outage to rejection |
| Registration expires after approval | Scheduled recheck and booking pause policy |

## Delivery plan

### Phase 0 — fix the foundation

- Make state, normalised plate, VIN and evidence mandatory for relevant vehicle categories.
- Remove the `UNKNOWN` plate fallback.
- Stop returning rego evidence from public listing APIs.
- Add a separate private evidence upload route with image/PDF validation.
- Introduce verification statuses and block publication until policy conditions are met.

### Phase 1 — assisted manual verification

- Add OCR and field comparison.
- Route every case to an internal review queue.
- Give reviewers direct links to the appropriate official jurisdiction check and a structured checklist.
- Delete or redact originals according to the approved retention policy.

This is the safest MVP because it improves evidence quality without pretending OCR is authoritative.

### Phase 2 — provider-backed automation

- Contract an approved registration/NEVDIS data provider.
- Auto-verify exact, high-confidence matches.
- Keep manual review for mismatches, special plates, fleet/lease authority and low-quality evidence.
- Add scheduled expiry/status rechecks.

### Phase 3 — stronger authority and fraud controls

- Add physical-plate challenge capture where risk justifies it.
- Add duplicate-document and cross-account risk signals.
- Add PPSR/provenance checks based on Redrive's insurance and risk policy.
- Measure false approvals, false rejections, review time, resubmission rate and provider failure rate.

## MVP acceptance criteria

- A host cannot publish a vehicle without a state, valid normalised plate, VIN and verification attempt.
- `S 168-CBO`, `s168cbo` and `S168-CBO` compare as `S168CBO`.
- A user can upload a valid JPEG/PNG/WebP or supported PDF, but disguised or oversized files are rejected server-side.
- Evidence is not reachable through an unsigned public URL.
- Plate, jurisdiction and VIN mismatches cannot be auto-approved.
- Provider downtime leaves the case processing and does not reject the host.
- Only authorised reviewers can access evidence, and every access/decision is audited.
- Public listing responses contain only safe verification status and date—not document URLs, registrant details or full VIN.
- Editing plate, jurisdiction or VIN invalidates the prior verification.
- Expiry triggers re-verification and the configured booking restriction.

## Final recommendation

Build **Phase 0 + Phase 1 first**: private evidence storage, PDF-safe intake, OCR-assisted matching, a clear status model and human review. In parallel, investigate a legitimate NEVDIS/registration-data agreement. Do not launch an “automatically verified” badge based only on an uploaded image, PDF, user-entered expiry date or scraped government page.

That sequence gives Redrive an auditable safety control quickly, while keeping the architecture ready for authoritative automation later.
