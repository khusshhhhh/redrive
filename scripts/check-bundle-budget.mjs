#!/usr/bin/env node
// Route-level JS budget gate. Run after `next build` (it reads `.next`).
//
// For every app route it sums the gzipped size of the JS chunks Next.js loads
// for that route's first paint (the "First Load JS" figure from the build
// table), plus the shared baseline every route pays. It exits non-zero when a
// route — or the shared baseline — is over budget, so a dependency or import
// that quietly bloats a page fails CI instead of shipping.
//
// Budgets live in `bundle-budget.json` at the repo root:
//   { "baselineKb": 130, "routeKb": 260, "routes": { "/explore": 300 } }
// Missing file → the defaults below. Raise a number deliberately in a PR when
// the growth is genuinely warranted; that keeps the ratchet visible in review.

import { gzipSync } from "node:zlib";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = join(ROOT, ".next");
const APP_MANIFEST = join(NEXT_DIR, "app-build-manifest.json");

const DEFAULTS = { baselineKb: 130, routeKb: 260, routes: {} };

if (!existsSync(APP_MANIFEST)) {
  console.error("check-bundle-budget: .next/app-build-manifest.json not found — run `next build` first.");
  process.exit(1);
}

const budget = (() => {
  const file = join(ROOT, "bundle-budget.json");
  if (!existsSync(file)) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(file, "utf8")) };
  } catch (error) {
    console.error("check-bundle-budget: bundle-budget.json is not valid JSON —", error.message);
    process.exit(1);
  }
})();

const manifest = JSON.parse(readFileSync(APP_MANIFEST, "utf8"));
const pages = manifest.pages || {};

const gzipCache = new Map();
const gzipKb = (relPath) => {
  if (gzipCache.has(relPath)) return gzipCache.get(relPath);
  const abs = join(NEXT_DIR, relPath);
  let kb = 0;
  if (existsSync(abs) && statSync(abs).isFile()) {
    kb = gzipSync(readFileSync(abs)).length / 1024;
  }
  gzipCache.set(relPath, kb);
  return kb;
};

const sumKb = (files) =>
  (files || []).filter((f) => f.endsWith(".js")).reduce((acc, f) => acc + gzipKb(f), 0);

// The shared baseline is what `/layout` pulls in — every route loads it.
const baselineFiles = new Set(pages["/layout"] || []);
const baselineKb = sumKb([...baselineFiles]);

const failures = [];
const rows = [];

if (baselineKb > budget.baselineKb) {
  failures.push(`shared baseline ${baselineKb.toFixed(1)} KB > ${budget.baselineKb} KB budget`);
}
rows.push(["(shared baseline)", baselineKb, budget.baselineKb]);

for (const [route, files] of Object.entries(pages)) {
  if (!route.endsWith("/page")) continue;
  const name = route.replace(/\/page$/, "") || "/";
  const firstLoadKb = sumKb(files); // route chunks already include the shared ones
  const limit = budget.routes[name] ?? budget.routeKb;
  rows.push([name, firstLoadKb, limit]);
  if (firstLoadKb > limit) {
    failures.push(`${name}: first-load JS ${firstLoadKb.toFixed(1)} KB > ${limit} KB budget`);
  }
}

rows.sort((a, b) => b[1] - a[1]);
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("Route", 40), pad("First Load JS (gz)", 20), "Budget");
console.log("-".repeat(70));
for (const [name, kb, limit] of rows) {
  const flag = kb > limit ? "  ✗ OVER" : "";
  console.log(pad(name, 40), pad(`${kb.toFixed(1)} KB`, 20), `${limit} KB${flag}`);
}

if (failures.length) {
  console.error("\nBundle budget exceeded:");
  for (const f of failures) console.error(`  - ${f}`);
  console.error("\nReduce the route's JS (dynamic import, lighter dep) or raise the number in bundle-budget.json with justification.");
  process.exit(1);
}

console.log("\nAll routes within budget.");
