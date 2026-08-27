import assert from "node:assert/strict";
import test from "node:test";

import { renterIdentityCheck } from "./bookingIdentity";

const YEAR_AHEAD = new Date(Date.now() + 365 * 86_400_000);
const YEAR_AGO = new Date(Date.now() - 365 * 86_400_000);

const verifiedRenter = {
  licenseStatus: "VERIFIED",
  licenseExpiresAt: YEAR_AHEAD,
  licenseExpiryDate: "2029-11-05",
  licenseIssuerState: "SA",
  licenseHolderName: "JATIN SUDHIRKUMAR ARORA",
  licenseNumberLast4: "1465",
  licenseNameMatches: true,
  licenseDobMatches: true,
  licenseVerifiedAt: new Date("2026-08-27T01:00:00Z"),
  licenseRejectionReason: null,
};

test("gives an owner the checked licence details and both match results", () => {
  const check = renterIdentityCheck(verifiedRenter);

  assert.equal(check.verified, true);
  assert.equal(check.unmetReason, null);
  assert.equal(check.holderName, "JATIN SUDHIRKUMAR ARORA");
  assert.equal(check.issuerState, "SA");
  assert.equal(check.expiryDate, "2029-11-05");
  assert.equal(check.licenceNumberLast4, "1465");
  assert.equal(check.firstNameMatches, true);
  assert.equal(check.dateOfBirthMatches, true);
  assert.equal(check.checkedAt, "2026-08-27T01:00:00.000Z");
});

test("never exposes licence images or the full licence number", () => {
  const check = renterIdentityCheck({
    ...verifiedRenter,
    // Fields a licence-bearing user also carries, which must not travel with it.
    ...({ licenseImage: "/api/files/license?asset=redrive/licenses/abc", licensePublicId: "redrive/licenses/abc" } as object),
  });

  const serialised = JSON.stringify(check);
  assert.equal(serialised.includes("redrive/licenses"), false);
  assert.equal(Object.keys(check).some((key) => key.toLowerCase().includes("image")), false);
});

test("reports a licence that lapsed after it was checked rather than a stale pass", () => {
  const check = renterIdentityCheck({ ...verifiedRenter, licenseExpiresAt: YEAR_AGO });

  assert.equal(check.verified, false);
  assert.equal(check.unmetReason, "The licence has expired since it was checked.");
});

test("explains each unverified state to the owner reviewing the request", () => {
  assert.equal(
    renterIdentityCheck({ licenseStatus: "NOT_SUBMITTED" }).unmetReason,
    "No licence has been checked on this account.",
  );
  assert.equal(
    renterIdentityCheck({ licenseStatus: "NEEDS_CONFIRMATION" }).unmetReason,
    "A licence was read but the printed details were never confirmed.",
  );
  assert.equal(
    renterIdentityCheck({
      licenseStatus: "DETAILS_MISMATCH",
      licenseRejectionReason: "The first name on the licence does not match the one on this account.",
    }).unmetReason,
    "The first name on the licence does not match the one on this account.",
  );
  assert.equal(renterIdentityCheck({}).verified, false);
});
