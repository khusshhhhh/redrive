import assert from "node:assert/strict";
import test from "node:test";

import { classifyGoogleVisionFailure } from "./googleVision";

test("Vision API invalid keys are classified as configuration failures", () => {
  assert.deepEqual(classifyGoogleVisionFailure(400, {
    error: { status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] },
  }), { code: "OCR_CONFIGURATION_ERROR", providerReason: "API_KEY_INVALID" });
});

test("a disabled Vision API is not mistaken for an image-quality failure", () => {
  assert.deepEqual(classifyGoogleVisionFailure(403, {
    error: { status: "PERMISSION_DENIED", details: [{ reason: "SERVICE_DISABLED" }] },
  }), { code: "OCR_SERVICE_DISABLED", providerReason: "SERVICE_DISABLED" });
});

test("Vision API quota failures remain retryable provider failures", () => {
  assert.deepEqual(classifyGoogleVisionFailure(429, {
    error: { status: "RESOURCE_EXHAUSTED" },
  }), { code: "OCR_RATE_LIMITED", providerReason: "RESOURCE_EXHAUSTED" });
});
