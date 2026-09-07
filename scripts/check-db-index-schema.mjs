#!/usr/bin/env node
// Static guard (no database needed): the correctness-critical unique indexes
// that scripts/check-db-indexes.mjs asserts at runtime must still exist as
// @unique / @@unique in prisma/schema.prisma. If someone drops a uniqueness
// constraint, this fails in CI instead of the runtime check quietly passing
// against a stale expectation — or a real dedupe guard silently disappearing.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
const checkSource = readFileSync(join(ROOT, "scripts", "check-db-indexes.mjs"), "utf8");

// ── schema: model -> Set of unique key signatures ("field" or "a+b") ────────
const schemaUniques = new Map();
let currentModel = null;
for (const rawLine of schema.split("\n")) {
  const line = rawLine.trim();
  const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    schemaUniques.set(currentModel, new Set());
    continue;
  }
  if (line === "}") {
    currentModel = null;
    continue;
  }
  if (!currentModel) continue;

  const fieldMatch = line.match(/^(\w+)\s+\S+.*@unique/);
  if (fieldMatch) schemaUniques.get(currentModel).add(fieldMatch[1]);

  const compoundMatch = line.match(/@@unique\(\s*\[([^\]]+)\]/);
  if (compoundMatch) {
    const sig = compoundMatch[1].split(",").map((s) => s.trim()).join("+");
    schemaUniques.get(currentModel).add(sig);
  }
}

// ── check-db-indexes.mjs: the REQUIRED rows marked unique: true ─────────────
const rowRe = /\[\s*"(\w+)"\s*,\s*\{([^}]+)\}\s*,\s*\{([^}]*)\}\s*\]/g;
const expected = [];
let m;
while ((m = rowRe.exec(checkSource))) {
  const [, collection, keyBody, opts] = m;
  if (!/unique\s*:\s*true/.test(opts)) continue;
  const fields = [...keyBody.matchAll(/(\w+)\s*:\s*1/g)].map((x) => x[1]);
  expected.push({ collection, sig: fields.join("+") });
}

const problems = [];
for (const { collection, sig } of expected) {
  const uniques = schemaUniques.get(collection);
  if (!uniques) {
    problems.push(`${collection} — model not found in schema.prisma`);
  } else if (!uniques.has(sig)) {
    problems.push(`${collection} { ${sig.replace(/\+/g, ", ")} } — no matching @unique / @@unique`);
  }
}

if (problems.length) {
  console.error("check-db-index-schema: check-db-indexes.mjs expects uniques the schema no longer declares:");
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("\nEither restore the constraint in prisma/schema.prisma, or update the REQUIRED list.");
  process.exit(1);
}

console.log(`check-db-index-schema: OK — ${expected.length} critical unique indexes all backed by the schema.`);
