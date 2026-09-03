import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(path) : entry.name === "route.ts" ? [path] : [];
  });
}

test("every App Router API handler uses the low-overhead monitoring wrapper", () => {
  const files = routeFiles(join(process.cwd(), "app", "api"));
  let handlers = 0;

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    // A handler is monitored whether it uses `monitorApiRoute` directly or the
    // `defineApiRoute` wrapper (which calls `monitorApiRoute` internally).
    const wrapped =
      source.match(/export const (GET|POST|PUT|PATCH|DELETE) = (monitorApiRoute|defineApiRoute)\(/g) || [];
    const unwrapped = source.match(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g) || [];
    assert.equal(unwrapped.length, 0, `${file} contains an unmonitored API handler`);
    assert.ok(wrapped.length > 0, `${file} has no monitored API exports`);
    handlers += wrapped.length;
  }

  assert.ok(handlers >= 70, `expected at least 70 monitored handlers, found ${handlers}`);
});

test("the legacy NextAuth endpoint is monitored too", () => {
  const source = readFileSync(join(process.cwd(), "pages", "api", "auth", "[...nextauth].ts"), "utf8");
  assert.match(source, /monitorPagesApiRoute\("\/api\/auth\/\[\.\.\.nextauth\]"/);
});
