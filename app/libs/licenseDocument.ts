export const AU_ISSUERS = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;
export type AustralianIssuer = typeof AU_ISSUERS[number];

export type ExtractedLicenseFields = {
  givenNames: string;
  familyName: string;
  dateOfBirth: string;
  expiryDate: string;
  licenseNumber: string;
  cardNumber: string;
  issuerState: AustralianIssuer | "";
};

export type LicenseAnalysis = {
  isAustralianDriverLicense: boolean;
  confidence: number;
  fields: ExtractedLicenseFields;
  reasons: string[];
};

const STATE_PATTERNS: Array<[AustralianIssuer, RegExp[]]> = [
  ["ACT", [/AUSTRALIAN CAPITAL TERRITORY/i, /\bACT\b/i]],
  ["NSW", [/NEW SOUTH WALES/i, /\bNSW\b/i]],
  ["NT", [/NORTHERN TERRITORY/i, /\bNT\b/i]],
  ["QLD", [/QUEENSLAND/i, /\bQLD\b/i]],
  ["SA", [/SOUTH AUSTRALIA/i, /\bSA\b/i]],
  ["TAS", [/TASMANIA/i, /\bTAS\b/i]],
  ["VIC", [/VICTORIA/i, /\bVIC\b/i]],
  ["WA", [/WESTERN AUSTRALIA/i, /\bWA\b/i]],
];

const DATE_TOKEN = /(?:\d{1,2}[./\- ]\d{1,2}[./\- ]\d{2,4}|\d{4}[./\-]\d{1,2}[./\-]\d{1,2})/;

function lines(text: string) {
  return text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function valueNearLabel(source: string[], labels: RegExp[]) {
  for (let index = 0; index < source.length; index += 1) {
    const line = source[index];
    for (const label of labels) {
      const match = line.match(label);
      if (!match) continue;
      const sameLine = line.slice((match.index || 0) + match[0].length)
        .replace(/^\s*[:#.-]?\s*/, "")
        .trim();
      if (sameLine) return sameLine;
      if (source[index + 1]) return source[index + 1];
    }
  }
  return "";
}

function extractDate(source: string[], labels: RegExp[]) {
  const nearby = valueNearLabel(source, labels);
  const nearbyMatch = nearby.match(DATE_TOKEN);
  if (nearbyMatch) return normalizeDate(nearbyMatch[0]);

  for (const line of source) {
    if (!labels.some((label) => label.test(line))) continue;
    const match = line.match(DATE_TOKEN);
    if (match) return normalizeDate(match[0]);
  }
  return "";
}

function normalizeDate(value: string) {
  const compact = value.trim().replace(/[. ]/g, "/").replace(/-/g, "/");
  const parts = compact.split("/").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return "";
  let [first, second, third] = parts;
  let year: number;
  let month: number;
  let day: number;

  if (String(parts[0]).length === 4) {
    [year, month, day] = [first, second, third];
  } else {
    [day, month, year] = [first, second, third];
    if (year < 100) year += year >= 50 ? 1900 : 2000;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function cleanName(value: string) {
  return value
    .replace(/\b(?:DOB|EXP(?:IRY|IRES)?|LICEN[CS]E|CARD)\b.*$/i, "")
    .replace(/[^\p{L}' -]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function normalizeDocumentNumber(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function extractNumber(source: string[], labels: RegExp[]) {
  const value = valueNearLabel(source, labels);
  const match = value.toUpperCase().match(/[A-Z0-9][A-Z0-9 -]{3,24}/);
  return normalizeDocumentNumber(match?.[0] || "");
}

function issuerFromText(text: string): AustralianIssuer | "" {
  for (const [state, patterns] of STATE_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) return state;
  }
  return "";
}

export function analyzeAustralianLicense(frontText: string, backText: string, ocrConfidence: number): LicenseAnalysis {
  const frontLines = lines(frontText);
  const backLines = lines(backText);
  const allText = `${frontText}\n${backText}`;
  const allLines = [...frontLines, ...backLines];
  const issuerState = issuerFromText(allText);
  const hasDriverLabel = /DRIV(?:ER|ING)[’'S ]*LICEN[CS]E|LICEN[CS]E TO DRIVE/i.test(allText);
  const hasAustralia = /AUSTRALIA/i.test(allText) || Boolean(issuerState);

  const fields: ExtractedLicenseFields = {
    givenNames: cleanName(valueNearLabel(frontLines, [/GIVEN NAME(?:S|\/S)?/i, /FIRST NAME/i])),
    familyName: cleanName(valueNearLabel(frontLines, [/FAMILY NAME/i, /SURNAME/i, /LAST NAME/i])),
    dateOfBirth: extractDate(frontLines, [/DATE OF BIRTH/i, /\bDOB\b/i, /BIRTH DATE/i]),
    expiryDate: extractDate(allLines, [/EXPIRY DATE/i, /DATE OF EXPIRY/i, /\bEXP(?:IRY|IRES)?\b/i]),
    licenseNumber: extractNumber(frontLines, [/LICEN[CS]E\s*(?:NO|NUMBER|#)/i, /\bCRN\b/i]),
    cardNumber: extractNumber(allLines, [/CARD\s*(?:NO|NUMBER|#)/i]),
    issuerState,
  };

  const evidenceCount = [
    fields.dateOfBirth,
    fields.expiryDate,
    fields.licenseNumber,
    fields.cardNumber,
    fields.givenNames || fields.familyName,
  ].filter(Boolean).length;
  const reasons: string[] = [];

  if (!issuerState) reasons.push("ISSUER_NOT_FOUND");
  if (!hasDriverLabel) reasons.push("DRIVER_LICENCE_LABEL_NOT_FOUND");
  if (!hasAustralia) reasons.push("AUSTRALIAN_MARKER_NOT_FOUND");
  if (evidenceCount < 3) reasons.push("TOO_FEW_LICENCE_FIELDS");
  if (!fields.givenNames || !fields.familyName) reasons.push("NAME_NOT_READ");
  if (!fields.dateOfBirth) reasons.push("DATE_OF_BIRTH_NOT_READ");
  if (!fields.expiryDate) reasons.push("EXPIRY_NOT_READ");
  if (!fields.licenseNumber) reasons.push("LICENCE_NUMBER_NOT_READ");
  if (!fields.cardNumber) reasons.push("CARD_NUMBER_NOT_READ");
  if (!frontText || !backText) reasons.push("FRONT_OR_BACK_UNREADABLE");

  const classifierScore = [Boolean(issuerState), hasDriverLabel, hasAustralia, evidenceCount >= 3]
    .filter(Boolean).length / 4;
  const confidence = Math.round(((classifierScore * 0.7) + (Math.max(0, Math.min(1, ocrConfidence)) * 0.3)) * 100) / 100;

  return {
    isAustralianDriverLicense: Boolean(
      issuerState &&
      hasDriverLabel &&
      hasAustralia &&
      fields.givenNames &&
      fields.familyName &&
      fields.dateOfBirth &&
      fields.expiryDate &&
      fields.licenseNumber &&
      fields.cardNumber
    ),
    confidence,
    fields,
    reasons,
  };
}

function nameTokens(value: string) {
  return value.normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z' -]/g, " ")
    .split(/[\s'-]+/)
    .filter(Boolean);
}

function tokenMatches(left: string, right: string) {
  return left === right || (left.length === 1 && right.startsWith(left)) || (right.length === 1 && left.startsWith(right));
}

export function licenseNameMatchesProfile(profileName: string, givenNames: string, familyName: string) {
  const profile = nameTokens(profileName);
  const given = nameTokens(givenNames);
  const family = nameTokens(familyName);
  if (!profile.length || !given.length || !family.length) return false;

  const firstMatches = tokenMatches(profile[0], given[0]);
  const familyMatches = family.some((familyToken) => profile.some((profileToken) => tokenMatches(profileToken, familyToken)));
  const document = [...given, ...family];
  const profileCovered = profile.every((profileToken) => document.some((documentToken) => tokenMatches(profileToken, documentToken)));
  return firstMatches && familyMatches && profileCovered;
}

export function isValidLicenseDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && normalizeDate(value) === value;
}

export function todayInAustralia(timeZone = "Australia/Adelaide") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const ISSUER_TIME_ZONES: Record<AustralianIssuer, string> = {
  ACT: "Australia/Sydney",
  NSW: "Australia/Sydney",
  NT: "Australia/Darwin",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  TAS: "Australia/Hobart",
  VIC: "Australia/Melbourne",
  WA: "Australia/Perth",
};

export function licenseExpiryInstant(value: string, issuer: AustralianIssuer) {
  const [year, month, day] = value.split("-").map(Number);
  const nominalUtc = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISSUER_TIME_ZONES[issuer],
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(nominalUtc))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 999);
  const zoneOffset = representedAsUtc - nominalUtc;
  return new Date(nominalUtc - zoneOffset);
}

export function todayForIssuer(issuer: AustralianIssuer) {
  return todayInAustralia(ISSUER_TIME_ZONES[issuer]);
}
