import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  UploadValidationError,
  hasValidImageSignature,
  sanitizeImage,
  validateImageUploadMetadata,
} from "./uploadSecurity";

test("rejects executable and double extensions", () => {
  const malicious = new File([Buffer.from([0xff, 0xd8, 0xff])], "licence.php.jpg", { type: "image/jpeg" });
  assert.throws(() => validateImageUploadMetadata(malicious), UploadValidationError);
});

test("rejects a MIME type outside the image allow-list", () => {
  const script = new File(["<?php echo 1; ?>"], "licence.php", { type: "application/x-httpd-php" });
  assert.throws(() => validateImageUploadMetadata(script), UploadValidationError);
});

test("decode and re-encode strips data appended to a valid image", async () => {
  const jpeg = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "white" },
  }).jpeg().toBuffer();
  const polyglot = Buffer.concat([jpeg, Buffer.from("<?php echo 'bad'; ?>")]);
  const safe = await sanitizeImage(polyglot, "image/jpeg");

  assert.equal(hasValidImageSignature(safe, "image/jpeg"), true);
  assert.equal(safe.includes(Buffer.from("<?php")), false);
});

