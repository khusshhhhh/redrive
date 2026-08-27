import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_TOAST_MS,
  MIN_TOAST_MS,
  readingDurationMs,
  toastTextContent,
} from "./toastDuration";

test("gives a longer message more time on screen", () => {
  const short = readingDurationMs("Saved");
  const long = readingDurationMs(
    "These images could not be read as an Australian driver licence. Photograph the front and back of the card itself, filling the frame, with no glare.",
  );
  assert.ok(long > short);
});

test("keeps every message inside a readable range", () => {
  assert.equal(readingDurationMs(""), MIN_TOAST_MS);
  assert.equal(readingDurationMs("Hi"), MIN_TOAST_MS);
  assert.equal(readingDurationMs("word ".repeat(400)), MAX_TOAST_MS);
  assert.ok(readingDurationMs("Your listing was published") > MIN_TOAST_MS - 1);
});

test("measures the text inside an element so its timing is not guessed", () => {
  const element = { props: { children: ["Upload failed. ", { props: { children: "Try again." } }] } };
  assert.equal(toastTextContent(element), "Upload failed.  Try again.");
  assert.equal(toastTextContent(null), "");
  assert.equal(toastTextContent(() => "dynamic"), "");
});
