import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { mobileError, mobileRequestId, parseMobileJson } from "./mobile-api/responses";

test("mobile errors correlate the validated request id in the header and body", async () => {
  const request = new Request("https://api.redrive.test/api/mobile/v1/me", { headers: { "x-request-id": "client-request-123" } });
  const response = mobileError(request, 403, "FORBIDDEN", "Access denied.");
  const body = await response.json();
  assert.equal(response.headers.get("x-request-id"), "client-request-123");
  assert.equal(body.error.requestId, "client-request-123");
  assert.equal(mobileRequestId(request), "client-request-123");
});

test("mobile JSON validation returns stable field errors", async () => {
  const request = new Request("https://api.redrive.test/api/mobile/v1/example", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email" }),
  });
  const parsed = await parseMobileJson(request, z.object({ email: z.email() }));
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.response.status, 400);
  const body = await parsed.response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.equal(typeof body.error.fields.email, "string");
});
