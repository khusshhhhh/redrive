import assert from "node:assert/strict";
import test from "node:test";

import { buildAndroidAssociation, buildAppleAssociation } from "./mobileAssociations";

const fingerprint = Array.from({ length: 32 }, (_, index) => index.toString(16).padStart(2, "0")).join(":").toUpperCase();

test("builds a path-restricted Apple association", () => {
  const result = buildAppleAssociation({ appleTeamId: "AB12CD34EF" });
  assert.deepEqual(result.applinks.details[0].appIDs, ["AB12CD34EF.au.com.redrive.app"]);
  assert.deepEqual(result.applinks.details[0].components.map((component) => component["/"]), ["/listings/*", "/trips/*", "/messages/*"]);
});

test("builds an Android association and accepts key rotation fingerprints", () => {
  const result = buildAndroidAssociation({ androidFingerprints: `${fingerprint},${fingerprint}` });
  assert.equal(result[0].target.package_name, "au.com.redrive.app");
  assert.equal(result[0].target.sha256_cert_fingerprints.length, 2);
});

test("rejects placeholders and unapproved identifiers", () => {
  assert.throws(() => buildAppleAssociation({ appleTeamId: "TEAM_ID" }));
  assert.throws(() => buildAndroidAssociation({ androidFingerprints: "replace-me" }));
  assert.throws(() => buildAndroidAssociation({ androidPackage: "com.attacker.app", androidFingerprints: fingerprint }));
});
