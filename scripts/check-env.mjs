#!/usr/bin/env node
// Keeps `.env.example` honest: every environment variable the server code reads
// must be documented there, so a missing var is a build-time failure in CI
// instead of a surprise on the first request in a new environment.
//
//   node scripts/check-env.mjs
//
// Fails (exit 1) when code reads a `process.env.X` that `.env.example` doesn't
// mention. Also warns about keys in `.env.example` that nothing reads (probably
// dead config) — those don't fail the build.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();

// Framework / platform / tooling vars that are always present and never belong
// in `.env.example`.
const IMPLICIT = new Set([
  "NODE_ENV",
  "CI",
  "TZ",
  "PORT",
  "ANALYZE",
  "NEXT_RUNTIME",
  "NEXT_PHASE",
  "NEXT_TELEMETRY_DISABLED",
  "npm_package_version",
  "npm_lifecycle_event",
  // Vercel system env (auto-injected on every deployment)
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_REGION",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_PROJECT_PRODUCTION_URL",
  // Vercel also exposes these NEXT_PUBLIC_ mirrors to the client automatically
  "NEXT_PUBLIC_VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_URL",
  "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
  // Lambda / Vercel runtime
  "AWS_REGION",
  "AWS_LAMBDA_FUNCTION_NAME",
  // GitHub Actions
  "GITHUB_ACTIONS",
  "GITHUB_SHA",
  "GITHUB_REF",
  "E2E_PORT",
  "E2E_BASE_URL",
]);

const SCAN_DIRS = ["app", "pages", "scripts", "packages", "apps"];
const SCAN_FILES = [
  "middleware.ts",
  "next.config.js",
  "instrumentation.ts",
  "instrumentation-client.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  "playwright.config.ts",
];
const CODE_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".cjs"]);
const ENV_REF = /process\.env(?:\.([A-Z0-9_]+)|\[\s*["'`]([A-Z0-9_]+)["'`]\s*\])/g;
// `const { A, B, C } = process.env` (single-line)
const ENV_DESTRUCTURE = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*process\.env/g;
// project env helpers: required("X"), optionalEnv("X"), env("X"), getEnv("X")
const ENV_HELPER = /\b(?:required|optional|optionalEnv|requireEnv|readEnv|getEnv|env)\(\s*["'`]([A-Z][A-Z0-9_]+)["'`]/g;

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "dist-web",
  "build",
  "coverage",
  "ios",
  "android",
  "playwright-report",
  "test-results",
  ".git",
  ".next",
  ".turbo",
  ".expo",
  ".vscode",
  ".claude",
  ".idea",
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (CODE_EXT.has(extname(entry.name)) && !entry.name.endsWith(".d.ts")) out.push(path);
  }
  return out;
}

const SELF = join(ROOT, "scripts", "check-env.mjs");
const files = [
  ...SCAN_DIRS.filter((d) => existsSync(join(ROOT, d))).flatMap((d) => walk(join(ROOT, d))),
  ...SCAN_FILES.filter((f) => existsSync(join(ROOT, f))).map((f) => join(ROOT, f)),
].filter((f) => f !== SELF);

/** var name -> Set of files that read it */
const used = new Map();
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const rel = file.replace(ROOT + "/", "").replace(ROOT + "\\", "");
  const record = (name) => {
    if (!name || name.length < 3 || IMPLICIT.has(name) || !/^[A-Z][A-Z0-9_]*$/.test(name)) return;
    if (!used.has(name)) used.set(name, new Set());
    used.get(name).add(rel);
  };

  let match;
  ENV_REF.lastIndex = 0;
  while ((match = ENV_REF.exec(source))) record(match[1] || match[2]);

  ENV_DESTRUCTURE.lastIndex = 0;
  while ((match = ENV_DESTRUCTURE.exec(source))) {
    for (const part of match[1].split(",")) record(part.split(":")[0].trim());
  }

  // Only trust the env-helper heuristic in files that actually touch process.env
  // (avoids matching an unrelated local function called `env(...)`).
  if (source.includes("process.env")) {
    ENV_HELPER.lastIndex = 0;
    while ((match = ENV_HELPER.exec(source))) record(match[1]);
  }
}

const examplePath = join(ROOT, ".env.example");
if (!existsSync(examplePath)) {
  console.error("check-env: .env.example is missing.");
  process.exit(1);
}
const documented = new Set(
  readFileSync(examplePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0].trim())
    .filter(Boolean),
);

const undocumented = [...used.keys()].filter((name) => !documented.has(name)).sort();
const unused = [...documented].filter((name) => !used.has(name) && !IMPLICIT.has(name)).sort();

if (unused.length) {
  console.warn("check-env: documented in .env.example but not read anywhere (possibly dead config):");
  for (const name of unused) console.warn(`  - ${name}`);
  console.warn("");
}

if (undocumented.length) {
  console.error("check-env: read by code but NOT in .env.example — add them (with a comment):");
  for (const name of undocumented) {
    const where = [...used.get(name)].slice(0, 3).join(", ");
    console.error(`  - ${name}   (${where})`);
  }
  process.exit(1);
}

console.log(`check-env: OK — ${used.size} environment variables, all documented in .env.example.`);
