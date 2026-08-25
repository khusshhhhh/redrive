import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const production = process.argv.includes("--production");
const failures = [];
const inspected = [];

const secretPatterns = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private signing key"],
  [/\bsk_(?:live|test)_[A-Za-z0-9]{12,}/, "Stripe secret key"],
  [/\bwhsec_[A-Za-z0-9]{12,}/, "Stripe webhook secret"],
  [/mongodb(?:\+srv)?:\/\/[^<\s:]+:[^<\s@]+@/i, "MongoDB credentials"],
  [/CLOUDINARY_API_SECRET\s*[:=]\s*["'][^"']{8,}/, "Cloudinary secret"],
  [/MOBILE_REFRESH_TOKEN_PEPPER\s*[:=]\s*["'][^"']{8,}/, "mobile refresh-token pepper"],
  [/EXPO_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|PASSWORD|REFRESH_TOKEN)\b/, "secret-shaped EXPO_PUBLIC variable"],
];

const ignoredDirectories = new Set(["node_modules", ".expo", "dist"]);
const inspectedExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx", ".json"]);

function extension(path) {
  const index = path.lastIndexOf(".");
  return index < 0 ? "" : path.slice(index).toLowerCase();
}

function scanDirectory(directory) {
  for (const name of readdirSync(directory)) {
    if (ignoredDirectories.has(name)) continue;
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) scanDirectory(path);
    else if (inspectedExtensions.has(extension(path))) {
      inspected.push(path);
      const source = readFileSync(path, "utf8");
      for (const [pattern, label] of secretPatterns) {
        if (pattern.test(source)) failures.push(`${relative(repositoryRoot, path)} contains a ${label}`);
      }
    }
  }
}

function requireEnvironment(name, validator, guidance) {
  const value = process.env[name]?.trim();
  if (!value || !validator(value)) failures.push(`${name} ${guidance}`);
}

scanDirectory(resolve(repositoryRoot, "apps", "mobile"));

const sensitiveTrackedNames = /(google-services\.json|GoogleService-Info\.plist|credentials\.json|\.p8$|\.p12$|\.jks$|\.keystore$|\.pem$)/i;
try {
  const tracked = execFileSync("git", ["ls-files", "apps/mobile"], { cwd: repositoryRoot, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  for (const path of tracked) if (sensitiveTrackedNames.test(path)) failures.push(`${path} is a tracked credential/signing artifact`);
} catch {
  failures.push("Git tracked-file inspection could not run");
}

if (production) {
  requireEnvironment("EXPO_PUBLIC_APP_ENV", (value) => value === "production", "must equal production");
  requireEnvironment("EXPO_PUBLIC_API_ORIGIN", (value) => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }, "must be a valid HTTPS origin");
  requireEnvironment("EXPO_PUBLIC_LINK_HOST", (value) => /^[A-Za-z0-9.-]+$/.test(value) && !value.includes("localhost"), "must be a production hostname");
  requireEnvironment("EXPO_PUBLIC_EAS_PROJECT_ID", (value) => /^[0-9a-f-]{36}$/i.test(value), "must be the EAS project UUID");
  requireEnvironment("MOBILE_APPLE_TEAM_ID", (value) => /^[A-Z0-9]{10}$/.test(value), "must be the 10-character team ID");
  requireEnvironment("MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS", (value) => value.split(",").every((entry) => /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/i.test(entry.trim())), "must contain valid signing fingerprints");
}

if (failures.length) {
  process.stderr.write(`Mobile release verification failed:\n- ${failures.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Mobile release verification passed (${inspected.length} source/config files scanned${production ? ", production environment checked" : ""}).\n`);
}
