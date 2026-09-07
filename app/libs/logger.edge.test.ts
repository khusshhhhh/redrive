import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Regression: middleware, the edge instrumentation hook and edge route handlers
// run on the Edge runtime, where `process.stdout` is undefined. A bare
// `process.stdout.write(...)` there throws and crashed production with
// MIDDLEWARE_INVOCATION_FAILED. Every stdout access in the logger must be
// guarded, with a `console` fallback.
test("logger never accesses process.stdout without a guard", () => {
  const source = readFileSync(join(process.cwd(), "app", "libs", "logger.ts"), "utf8");

  assert.match(source, /process\.stdout\?\./, "expected optional-chained stdout probe");
  assert.match(source, /consoleFor\(level\)/, "expected a console fallback path");

  const bareWrite = source
    .split("\n")
    .filter(
      (line) =>
        /process\.stdout\.write\(/.test(line) &&
        // the one allowed spot: the writer closure, which only runs after the
        // `typeof process.stdout?.write === "function"` probe above
        !/\(chunk\)\s*=>\s*process\.stdout\.write\(chunk\)/.test(line),
    );

  assert.deepEqual(bareWrite, [], `unguarded process.stdout.write:\n${bareWrite.join("\n")}`);
});
