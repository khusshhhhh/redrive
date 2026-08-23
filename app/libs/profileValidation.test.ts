import assert from "node:assert/strict";
import test from "node:test";

import { isAtLeast18, isValidAustralianMobile, isValidDateOfBirth } from "./profileValidation";

test("normalises and validates Australian mobile formats", () => {
  assert.equal(isValidAustralianMobile("0412 345 678"), true);
  assert.equal(isValidAustralianMobile("+61 412 345 678"), true);
  assert.equal(isValidAustralianMobile("12345"), false);
});

test("rejects impossible dates of birth", () => {
  assert.equal(isValidDateOfBirth("2000-02-29"), true);
  assert.equal(isValidDateOfBirth("2001-02-29"), false);
  assert.equal(isValidDateOfBirth("not-a-date"), false);
});

test("requires account holders to be at least 18", () => {
  const today = new Date();
  const adultBirthday = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  const minorBirthday = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate() + 1));
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  assert.equal(isAtLeast18(iso(adultBirthday)), true);
  assert.equal(isAtLeast18(iso(minorBirthday)), false);
});
