import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  UploadValidationError,
  hasValidImageSignature,
  imageTypeForUpload,
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

test("accepts common licence image formats and infers missing HEIC MIME metadata", () => {
  const avif = new File([Buffer.from("image")], "licence.avif", { type: "image/avif" });
  const heic = new File([Buffer.from("image")], "licence.heic", { type: "" });
  const tiff = new File([Buffer.from("image")], "licence.tiff", { type: "image/tiff" });

  assert.doesNotThrow(() => validateImageUploadMetadata(avif));
  assert.doesNotThrow(() => validateImageUploadMetadata(heic));
  assert.doesNotThrow(() => validateImageUploadMetadata(tiff));
  assert.equal(imageTypeForUpload(heic), "image/heic");
});

test("recognises HEIC, AVIF, GIF, BMP and TIFF file signatures", () => {
  assert.equal(hasValidImageSignature(Buffer.from("0000ftypheic0000"), "image/heic"), true);
  assert.equal(hasValidImageSignature(Buffer.from("0000ftypavif0000"), "image/avif"), true);
  assert.equal(hasValidImageSignature(Buffer.from("GIF89a000000"), "image/gif"), true);
  assert.equal(hasValidImageSignature(Buffer.from("BM000000"), "image/bmp"), true);
  assert.equal(hasValidImageSignature(Buffer.from([0x49, 0x49, 0x2a, 0x00]), "image/tiff"), true);
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

