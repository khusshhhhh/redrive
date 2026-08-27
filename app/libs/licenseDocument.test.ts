import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeAustralianLicense,
  licenseExpiryInstant,
  licenseFirstNameMatchesProfile,
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

test("matches on the account first name alone, whatever surname the licence carries", () => {
  // The family name is deliberately not compared: a married, hyphenated or
  // transliterated surname on the card is not evidence of a different person.
  assert.equal(licenseFirstNameMatchesProfile("John Smith", "John Peter"), true);
  assert.equal(licenseFirstNameMatchesProfile("John Jones", "John Peter"), true);
  assert.equal(licenseFirstNameMatchesProfile("john smith", "JOHN"), true);
  assert.equal(licenseFirstNameMatchesProfile("José Garcia", "JOSE"), true);
  assert.equal(licenseFirstNameMatchesProfile("Jane Smith", "John Peter"), false);
  assert.equal(licenseFirstNameMatchesProfile("", "John"), false);
  assert.equal(licenseFirstNameMatchesProfile("John Smith", ""), false);
});

test("does not accept a bare initial as a first name match", () => {
  // The first name is now the only name signal, so a single letter must not
  // stand in for every name that happens to begin with it.
  assert.equal(licenseFirstNameMatchesProfile("J Smith", "John"), false);
  assert.equal(licenseFirstNameMatchesProfile("John Smith", "J"), false);
});

test("converts the printed expiry day to the end of the issuer's local day", () => {
  assert.equal(licenseExpiryInstant("2027-01-15", "SA").toISOString(), "2027-01-15T13:29:59.999Z");
  assert.equal(licenseExpiryInstant("2027-01-15", "WA").toISOString(), "2027-01-15T15:59:59.999Z");
});


// South Australia prints the values under a column header and the holder's name
// as an unlabelled block above the address, which an OCR reader that only
// follows "LABEL value" pairs reads as no licence at all.
const SA_FRONT_STACKED = [
  "DRIVER'S LICENCE",
  "SOUTH AUSTRALIA",
  "Licence No",
  "Date Of Birth",
  "Expiry Date",
  "Conditions",
  "CK1465",
  "21/09/1980",
  "05/11/2029",
  "CLASS C",
  "JATIN SUDHIRKUMAR ARORA",
  "1A LEEDS AVE",
  "NORTHFIELD 5085",
  "PLEASE CARRY LICENCE WHEN DRIVING",
].join("\n");

const SA_FRONT_ROWS = [
  "DRIVER'S LICENCE",
  "SOUTH AUSTRALIA",
  "Licence No Date Of Birth Expiry Date Conditions",
  "CK1465 21/09/1980 05/11/2029",
  "CLASS C",
  "JATIN SUDHIRKUMAR ARORA",
  "1A LEEDS AVE",
  "NORTHFIELD 5085",
  "PLEASE CARRY LICENCE WHEN DRIVING",
].join("\n");

const SA_BACK = [
  "Issued under the authority of the Government of South Australia",
  "CONDITIONS",
  "D03340846",
  "Use of this permit/licence for identification purposes, other than policing road traffic laws, is not intended or authorised, and is solely at the risk of the user.",
  "AFFIX CHANGE OF ADDRESS LABEL HERE",
  "Change of address must be notified within 14 days.",
].join("\n");

const READ_ON = new Date("2026-08-27T00:00:00Z");

for (const [layout, frontText] of [["stacked cells", SA_FRONT_STACKED], ["packed rows", SA_FRONT_ROWS]] as const) {
  test(`reads a South Australian licence laid out in ${layout}`, () => {
    const result = analyzeAustralianLicense(frontText, SA_BACK, 0.9, READ_ON);

    assert.equal(result.isAustralianDriverLicense, true);
    assert.deepEqual(result.missingFields, []);
    assert.equal(result.fields.issuerState, "SA");
    assert.equal(result.fields.givenNames, "JATIN SUDHIRKUMAR");
    assert.equal(result.fields.familyName, "ARORA");
    assert.equal(result.fields.dateOfBirth, "1980-09-21");
    assert.equal(result.fields.expiryDate, "2029-11-05");
    assert.equal(result.fields.licenseNumber, "CK1465");
    assert.equal(result.fields.cardNumber, "D03340846");
  });
}

test("reports the fields it could not read instead of denying the document", () => {
  const result = analyzeAustralianLicense(
    "VICTORIA AUSTRALIA\nDRIVER LICENCE\nFAMILY NAME SMITH\nGIVEN NAMES JOHN\nDATE OF BIRTH 02/03/1990\nLICENCE NO 12345678",
    "SMUDGED",
    0.4,
    READ_ON,
  );

  assert.equal(result.isAustralianDriverLicense, true);
  assert.deepEqual(result.missingFields, ["expiryDate", "cardNumber"]);
});

test("does not read the legislation cited on the back as the issuing territory", () => {
  const result = analyzeAustralianLicense(
    "DRIVER'S LICENCE\nSOUTH AUSTRALIA\nLicence No\nDate Of Birth\nExpiry Date\nCK1465\n21/09/1980\n05/11/2029\nJANE MARY CITIZEN\n12 SMITH ST\nADELAIDE 5000",
    "ISSUED UNDER THE ROAD TRAFFIC ACT 1961\nCARD NUMBER D03340846",
    0.9,
    READ_ON,
  );

  assert.equal(result.fields.issuerState, "SA");
});

test("keeps a birth date and an expiry date in order when a column header reverses them", () => {
  const result = analyzeAustralianLicense(
    "NEW SOUTH WALES AUSTRALIA\nDRIVER LICENCE\nExpiry Date\nDate Of Birth\n05/11/2029\n21/09/1980\nJANE MARY CITIZEN\n12 SMITH ST\nSYDNEY 2000\nLICENCE NO 12345678",
    "CARD NUMBER 1234567890",
    0.9,
    READ_ON,
  );

  assert.equal(result.fields.dateOfBirth, "1980-09-21");
  assert.equal(result.fields.expiryDate, "2029-11-05");
});
