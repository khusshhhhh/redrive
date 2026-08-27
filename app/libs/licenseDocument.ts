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

export type LicenseFieldName = Exclude<keyof ExtractedLicenseFields, "issuerState">;

export type LicenseAnalysis = {
  isAustralianDriverLicense: boolean;
  confidence: number;
  fields: ExtractedLicenseFields;
  reasons: string[];
  missingFields: LicenseFieldName[];
};

// The printed state name is the reliable signal. Abbreviations are read from the
// front only, because the legal text on the back of most cards cites an "Act"
// and would otherwise be read as the Australian Capital Territory.
const STATE_NAMES: Array<[AustralianIssuer, RegExp]> = [
  ["ACT", /AUSTRALIAN CAPITAL TERRITORY/i],
  ["NSW", /NEW SOUTH WALES/i],
  ["NT", /NORTHERN TERRITORY/i],
  ["QLD", /QUEENSLAND/i],
  ["SA", /SOUTH AUSTRALIA/i],
  ["TAS", /TASMANIA/i],
  ["VIC", /VICTORIA/i],
  ["WA", /WESTERN AUSTRALIA/i],
];

const STATE_ABBREVIATIONS: Array<[AustralianIssuer, RegExp]> = [
  ["NSW", /\bNSW\b/],
  ["QLD", /\bQLD\b/],
  ["VIC", /\bVIC\b/],
  ["TAS", /\bTAS\b/],
  ["ACT", /\bACT\b/],
  ["SA", /\bSA\b/],
  ["WA", /\bWA\b/],
  ["NT", /\bNT\b/],
];

const LEGISLATION_ACT = /\bACT\b\s*(?:No\.?\s*)?\d{4}|(?:ROAD|TRAFFIC|MOTOR|TRANSPORT|VEHICLES?|UNDER THE)\s+\w*\s*\bACT\b/gi;

const DRIVER_LICENCE_LABEL = /DRIV(?:ER|ING)(?:['’ʼ´]?S)?\s*LICEN[CS]E|LICEN[CS]E TO DRIVE/i;

// The space separator is needed for cards that print "21 09 1980", but it also
// lets the pattern straddle two neighbouring values ("CK1465 21/09/1980"
// reads as "65 21/09"). The digit boundaries keep a match whole.
const DATE_TOKEN = /(?<!\d)(?:\d{1,2}[./\- ]\d{1,2}[./\- ]\d{2,4}|\d{4}[./\-]\d{1,2}[./\-]\d{1,2})(?!\d)/;

const MIN_LICENCE_AGE_YEARS = 15;
const MAX_LICENCE_AGE_YEARS = 110;
const MAX_EXPIRY_YEARS_AHEAD = 20;
const MAX_EXPIRY_YEARS_BEHIND = 25;

type LabelKind = LicenseFieldName;

// Ordered so the longer, more specific labels are tested first: "DATE OF BIRTH"
// must not be consumed by the bare expiry pattern.
const LABELS: Array<[LabelKind, RegExp]> = [
  ["dateOfBirth", /DATE OF BIRTH|BIRTH DATE|\bD\.?O\.?B\.?\b/i],
  ["expiryDate", /DATE OF EXPIRY|EXPIRY DATE|VALID (?:TO|UNTIL)|\bEXPIR(?:Y|ES)\b|\bEXP\b/i],
  ["licenseNumber", /LICEN[CS]E\s*(?:NO|NUMBER|#)|CLIENT\s*(?:NO|NUMBER)|\bCRN\b/i],
  ["cardNumber", /CARD\s*(?:NO|NUMBER|#)|DOCUMENT\s*(?:NO|NUMBER)/i],
  ["givenNames", /GIVEN NAME(?:S|\/S)?|FIRST NAME/i],
  ["familyName", /FAMILY NAME|SURNAME|LAST NAME/i],
];

const DATE_LABELS: LabelKind[] = ["dateOfBirth", "expiryDate"];
const NAME_LABELS: LabelKind[] = ["givenNames", "familyName"];

// Chrome printed on every card, plus the fragments the guilloche watermark tends
// to produce. A line carrying any of these is never a cardholder name.
const NON_NAME_WORDS = /AUSTRALI|LICEN[CS]E|PERMIT|DRIV|CLASS|CONDITION|EXPIR|BIRTH|CARD|NUMBER|ISSUED|AUTHORIT|GOVERNMENT|TERRITORY|WALES|QUEENSLAND|VICTORIA|TASMANIA|SOUTH|WESTERN|NORTHERN|CAPITAL|STRALIA|ADDRESS|SIGNATURE|PLEASE|CARRY|ROAD|TRAFFIC|STATE|SEX|HEIGHT|ORGAN|DONOR|SAMPLE|SPECIMEN|VALID|POLIC/i;

const STREET_WORDS = /\b(?:ST|STREET|RD|ROAD|AVE|AVENUE|DR|DRIVE|CRT|COURT|CT|PL|PLACE|LANE|LN|TCE|TERRACE|CRES|CRESCENT|HWY|HIGHWAY|PDE|PARADE|CIRCUIT|CCT|GROVE|BVD|BOULEVARD|CLOSE|SQUARE)\b/i;

function lines(text: string) {
  return text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function normalizeDate(value: string) {
  const compact = value.trim().replace(/[. ]/g, "/").replace(/-/g, "/");
  const parts = compact.split("/").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return "";
  const [first, second, third] = parts;
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

function isCodeToken(value: string) {
  const token = value.toUpperCase().trim();
  return /^[A-Z0-9][A-Z0-9\- ]{2,19}$/.test(token) && /\d/.test(token) && !DATE_TOKEN.test(token);
}

function labelsInLine(line: string) {
  const found: Array<{ kind: LabelKind; index: number; end: number }> = [];
  for (const [kind, pattern] of LABELS) {
    const match = line.match(pattern);
    if (!match || match.index === undefined) continue;
    const start = match.index;
    const end = start + match[0].length;
    if (found.some((entry) => start < entry.end && entry.index < end)) continue;
    found.push({ kind, index: start, end });
  }
  return found.sort((left, right) => left.index - right.index);
}

function remainderAfterLabel(line: string, end: number) {
  return line.slice(end).replace(/^\s*[:#.\-]?\s*/, "").trim();
}

function isSentence(line: string) {
  return line.length > 40 && line.split(" ").length > 6;
}

type Candidate = { kind: "date" | "code" | "name"; value: string };

// Values under a column header arrive either packed onto one line or split one
// per line, so every following line is broken into typed candidates and matched
// to the header columns by shape rather than by position alone.
function valueCandidates(line: string): Candidate[] {
  const candidates: Candidate[] = [];
  let remaining = line;

  for (;;) {
    const match = remaining.match(DATE_TOKEN);
    if (!match || match.index === undefined) break;
    const normalized = normalizeDate(match[0]);
    if (normalized) candidates.push({ kind: "date", value: normalized });
    remaining = `${remaining.slice(0, match.index)} ${remaining.slice(match.index + match[0].length)}`;
  }

  const rest = remaining.replace(/\s+/g, " ").trim();
  if (!rest) return candidates;

  for (const token of rest.split(" ")) {
    if (isCodeToken(token)) candidates.push({ kind: "code", value: normalizeDocumentNumber(token) });
  }
  if (!/\d/.test(rest) && /^[\p{L}' -]+$/u.test(rest) && rest.length >= 2) {
    candidates.push({ kind: "name", value: cleanName(rest) });
  }
  return candidates;
}

function assignFromColumns(columns: LabelKind[], valueLines: string[], fields: ExtractedLicenseFields) {
  const pool = valueLines.flatMap(valueCandidates);
  const used = new Set<number>();

  const take = (want: Candidate["kind"]) => {
    const index = pool.findIndex((candidate, position) => !used.has(position) && candidate.kind === want);
    if (index < 0) return "";
    used.add(index);
    return pool[index].value;
  };

  const nameColumns = columns.filter((column) => NAME_LABELS.includes(column));
  const nameCandidates = pool.filter((candidate) => candidate.kind === "name").length;

  for (const column of columns) {
    if (fields[column]) continue;
    if (NAME_LABELS.includes(column)) {
      // Only trust a name column when each one has a line of its own: a single
      // line under two name headers cannot be split without guessing.
      if (nameCandidates >= nameColumns.length) fields[column] = take("name");
      continue;
    }
    const value = take(DATE_LABELS.includes(column) ? "date" : "code");
    if (value) fields[column] = value;
  }
}

function collectValueLines(source: string[], start: number, limit: number) {
  const collected: string[] = [];
  for (let index = start; index < source.length && collected.length < limit; index += 1) {
    const line = source[index];
    if (isSentence(line)) break;
    const labels = labelsInLine(line);
    if (labels.length && !remainderAfterLabel(line, labels[labels.length - 1].end)) break;
    collected.push(line);
  }
  return collected;
}

function readLabelledFields(source: string[], fields: ExtractedLicenseFields) {
  let index = 0;
  while (index < source.length) {
    const labels = labelsInLine(source[index]);
    if (!labels.length) {
      index += 1;
      continue;
    }

    const last = labels[labels.length - 1];
    const trailing = remainderAfterLabel(source[index], last.end);

    // A header row: several columns on one line, values on the lines below.
    // Nothing may sit between the labels, and whatever trails the last one is a
    // column this reader does not track ("Conditions"), not a value.
    const labelsAreBare = labels.every((label, position) => {
      const next = labels[position + 1];
      return !next || !source[index].slice(label.end, next.index).replace(/[^\p{L}\p{N}]/gu, "");
    }) && !valueCandidates(trailing).some((candidate) => candidate.kind !== "name");

    if (labels.length > 1 && labelsAreBare) {
      const columns = labels.map((label) => label.kind);
      assignFromColumns(columns, collectValueLines(source, index + 1, columns.length + 2), fields);
      index += 1;
      continue;
    }

    // A run of bare label lines is that same header, wrapped one cell per line.
    if (labels.length === 1 && !trailing) {
      const columns: LabelKind[] = [labels[0].kind];
      let cursor = index + 1;
      while (cursor < source.length) {
        const next = labelsInLine(source[cursor]);
        if (next.length !== 1 || remainderAfterLabel(source[cursor], next[0].end)) break;
        columns.push(next[0].kind);
        cursor += 1;
      }
      if (columns.length > 1) {
        assignFromColumns(columns, collectValueLines(source, cursor, columns.length + 2), fields);
        index = cursor;
        continue;
      }
      const valueLine = source[index + 1];
      if (valueLine) assignFromColumns(columns, [valueLine], fields);
      index += 1;
      continue;
    }

    // "FAMILY NAME SMITH": the value sits after the label on the same line.
    for (let position = 0; position < labels.length; position += 1) {
      const label = labels[position];
      const nextLabel = labels[position + 1];
      const slice = source[index].slice(label.end, nextLabel ? nextLabel.index : undefined);
      const value = slice.replace(/^\s*[:#.\-]?\s*/, "").trim();
      if (value) assignFromColumns([label.kind], [value], fields);
    }
    index += 1;
  }
}

function yearsBetween(isoDate: string, reference: Date) {
  return (reference.getTime() - Date.parse(`${isoDate}T00:00:00Z`)) / (365.2425 * 86_400_000);
}

// South Australian and Queensland cards print the dates under a column header
// with nothing beside the value itself, so any date left unclaimed is placed by
// plausibility: a birth date is decades old, an expiry sits near today.
function fillDatesFromContext(source: string[], fields: ExtractedLicenseFields, now: Date) {
  if (fields.dateOfBirth && fields.expiryDate) return;

  const found: string[] = [];
  for (const line of source) {
    for (const candidate of valueCandidates(line)) {
      if (candidate.kind === "date" && !found.includes(candidate.value)) found.push(candidate.value);
    }
  }
  const unclaimed = found.filter((date) => date !== fields.dateOfBirth && date !== fields.expiryDate);

  if (!fields.dateOfBirth) {
    const birthDates = unclaimed.filter((date) => {
      const age = yearsBetween(date, now);
      return age >= MIN_LICENCE_AGE_YEARS && age <= MAX_LICENCE_AGE_YEARS;
    }).sort();
    if (birthDates.length) fields.dateOfBirth = birthDates[0];
  }

  if (!fields.expiryDate) {
    const expiries = unclaimed.filter((date) => {
      if (date === fields.dateOfBirth) return false;
      const age = yearsBetween(date, now);
      return age >= -MAX_EXPIRY_YEARS_AHEAD && age <= MAX_EXPIRY_YEARS_BEHIND;
    }).sort();
    if (expiries.length) fields.expiryDate = expiries[expiries.length - 1];
  }

}

// Whichever way the two dates were found, a birth date precedes an expiry.
function orderDates(fields: ExtractedLicenseFields) {
  if (fields.dateOfBirth && fields.expiryDate && fields.dateOfBirth > fields.expiryDate) {
    [fields.dateOfBirth, fields.expiryDate] = [fields.expiryDate, fields.dateOfBirth];
  }
}

function looksLikeAddress(line: string) {
  return /\d/.test(line) || STREET_WORDS.test(line);
}

function isNameLine(line: string) {
  if (/\d/.test(line) || NON_NAME_WORDS.test(line)) return false;
  if (!/^[\p{L}][\p{L}\p{M}' -]+$/u.test(line)) return false;
  const tokens = line.split(/[ -]+/).filter(Boolean);
  return tokens.length >= 2 && tokens.length <= 5 &&
    line.length >= 5 && line.length <= 60 &&
    tokens.every((token) => token.length <= 24);
}

// Several states print the holder's name as a plain block above the address with
// no label at all. The name is the block that an address line follows.
function fillNameFromContext(source: string[], fields: ExtractedLicenseFields) {
  if (fields.givenNames && fields.familyName) return;

  const candidates = source
    .map((line, index) => ({ line, index }))
    .filter((entry) => isNameLine(entry.line));
  if (!candidates.length) return;

  const beforeAddress = candidates.find((entry) => {
    const next = source[entry.index + 1];
    return Boolean(next) && looksLikeAddress(next) && !isNameLine(next);
  });
  const tokens = cleanName((beforeAddress || candidates[0]).line).split(" ").filter(Boolean);
  if (tokens.length < 2) return;

  // Australian cards print the given names first and the family name last.
  if (!fields.familyName) fields.familyName = tokens[tokens.length - 1];
  if (!fields.givenNames) fields.givenNames = tokens.slice(0, -1).join(" ");
}

// The back of a card carries a document number that is often printed with no
// label beside it, and some fronts print the licence number the same way.
function fillNumbersFromContext(
  frontLines: string[],
  backLines: string[],
  fields: ExtractedLicenseFields,
) {
  const claimed = new Set([fields.licenseNumber, fields.cardNumber].filter(Boolean));
  const standalone = (source: string[], test: (token: string) => boolean) => {
    for (const line of source) {
      if (isSentence(line) || labelsInLine(line).length) continue;
      for (const token of line.split(" ")) {
        if (!isCodeToken(token)) continue;
        const normalized = normalizeDocumentNumber(token);
        if (!claimed.has(normalized) && test(normalized)) return normalized;
      }
    }
    return "";
  };

  if (!fields.cardNumber) {
    fields.cardNumber = standalone(backLines, (token) => /^[A-Z]{0,2}\d{6,14}$/.test(token));
    if (fields.cardNumber) claimed.add(fields.cardNumber);
  }
  if (!fields.licenseNumber) {
    fields.licenseNumber = standalone(
      frontLines,
      (token) => /^[A-Z]{0,3}\d{3,12}$/.test(token) && token.length >= 5,
    );
  }
}

function issuerFromText(frontText: string, allText: string): AustralianIssuer | "" {
  for (const [state, pattern] of STATE_NAMES) {
    if (pattern.test(allText)) return state;
  }
  const withoutLegislation = frontText.replace(LEGISLATION_ACT, " ");
  for (const [state, pattern] of STATE_ABBREVIATIONS) {
    if (pattern.test(withoutLegislation)) return state;
  }
  return "";
}

export function analyzeAustralianLicense(
  frontText: string,
  backText: string,
  ocrConfidence: number,
  now = new Date(),
): LicenseAnalysis {
  const frontLines = lines(frontText);
  const backLines = lines(backText);
  const allText = `${frontText}\n${backText}`;
  const allLines = [...frontLines, ...backLines];
  const issuerState = issuerFromText(frontText, allText);
  const hasDriverLabel = DRIVER_LICENCE_LABEL.test(allText);
  const hasAustralia = /AUSTRALIA/i.test(allText) || Boolean(issuerState);

  const fields: ExtractedLicenseFields = {
    givenNames: "",
    familyName: "",
    dateOfBirth: "",
    expiryDate: "",
    licenseNumber: "",
    cardNumber: "",
    issuerState,
  };

  readLabelledFields(frontLines, fields);
  readLabelledFields(backLines, fields);
  fillDatesFromContext(allLines, fields, now);
  orderDates(fields);
  fillNameFromContext(frontLines, fields);
  fillNumbersFromContext(frontLines, backLines, fields);
  fields.givenNames = cleanName(fields.givenNames);
  fields.familyName = cleanName(fields.familyName);

  const allFieldNames: LicenseFieldName[] = [
    "givenNames",
    "familyName",
    "dateOfBirth",
    "expiryDate",
    "licenseNumber",
    "cardNumber",
  ];
  const missingFields = allFieldNames.filter((name) => !fields[name]);
  const evidenceCount = allFieldNames.length - missingFields.length;
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
    // Whether the document is an Australian driver licence is a question about
    // the document, not about how much of it the OCR happened to read. Fields
    // that could not be read are reported separately, so the holder is told
    // which value to photograph again rather than that it is not a licence.
    isAustralianDriverLicense: Boolean(issuerState) && hasDriverLabel && hasAustralia && evidenceCount >= 3,
    confidence,
    fields,
    reasons,
    missingFields,
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

// Identity is confirmed against the two values the account holder typed when
// they registered: their first name and their date of birth. The family name is
// deliberately not compared, because a licence routinely carries a married,
// hyphenated or transliterated surname that the profile never repeats, and a
// mismatch there used to block people who were exactly who they said they were.
export function licenseFirstNameMatchesProfile(profileName: string, givenNames: string) {
  const profile = nameTokens(profileName);
  const given = nameTokens(givenNames);
  if (!profile.length || !given.length) return false;
  return profile[0] === given[0];
}

export function isValidLicenseDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && normalizeDate(value) === value;
}

function todayInAustralia(timeZone = "Australia/Adelaide") {
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
