import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeAustralianLicense,
  licenseExpiryInstant,
  licenseNameMatchesProfile,
} from "./licenseDocument";

test("classifies an Australian driver licence and extracts labelled fields", () => {
  const result = analyzeAustralianLicense(
    [
      "NEW SOUTH WALES AUSTRALIA",
      "DRIVER LICENCE",
      "FAMILY NAME SMITH",
      "GIVEN NAMES JOHN PETER",
      "DATE OF BIRTH 02/03/1990",
      "LICENCE NO 12345678",
      "EXPIRY 18/09/2028",
    ].join("\n"),
    "CARD NUMBER 1234567890",
    0.94,
  );

  assert.equal(result.isAustralianDriverLicense, true);
  assert.equal(result.fields.issuerState, "NSW");
  assert.equal(result.fields.givenNames, "JOHN PETER");
  assert.equal(result.fields.familyName, "SMITH");
  assert.equal(result.fields.dateOfBirth, "1990-03-02");
  assert.equal(result.fields.expiryDate, "2028-09-18");
  assert.equal(result.fields.licenseNumber, "12345678");
  assert.equal(result.fields.cardNumber, "1234567890");
});

test("does not classify unrelated OCR text", () => {
  const result = analyzeAustralianLicense(
    "ELECTRICITY ACCOUNT\nAMOUNT DUE $120",
    "PAY ONLINE",
    0.98,
  );
  assert.equal(result.isAustralianDriverLicense, false);
});

test("matches an account name while allowing an omitted middle name or initial", () => {
  assert.equal(licenseNameMatchesProfile("John Smith", "John Peter", "Smith"), true);
  assert.equal(licenseNameMatchesProfile("John P Smith", "John Peter", "Smith"), true);
  assert.equal(licenseNameMatchesProfile("Jane Smith", "John Peter", "Smith"), false);
  assert.equal(licenseNameMatchesProfile("John Jones", "John Peter", "Smith"), false);
});

test("converts the printed expiry day to the end of the issuer's local day", () => {
  assert.equal(licenseExpiryInstant("2027-01-15", "SA").toISOString(), "2027-01-15T13:29:59.999Z");
  assert.equal(licenseExpiryInstant("2027-01-15", "WA").toISOString(), "2027-01-15T15:59:59.999Z");
});

