import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { verifyPassword, INVALID_PASSWORD_HASH } from "@/app/libs/credentialCheck";

test("verifyPassword returns true only for the matching password", async () => {
  const hash = await bcrypt.hash("correct-horse", 10);
  assert.equal(await verifyPassword("correct-horse", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
});

test("verifyPassword is false (never throws) when the account has no password", async () => {
  assert.equal(await verifyPassword("anything", null), false);
  assert.equal(await verifyPassword("anything", undefined), false);
  assert.equal(await verifyPassword("anything", ""), false);
});

test("INVALID_PASSWORD_HASH is a real bcrypt hash that no obvious password matches", async () => {
  // It must be a well-formed hash so bcrypt.compare does real work (constant
  // time), but must not be guessable.
  assert.match(INVALID_PASSWORD_HASH, /^\$2[aby]\$\d{2}\$/);
  assert.equal(await bcrypt.compare("", INVALID_PASSWORD_HASH), false);
  assert.equal(await bcrypt.compare("password", INVALID_PASSWORD_HASH), false);
});
