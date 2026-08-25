export function normalizeAustralianMobile(value: string) {
  const compact = value.replace(/[\s()-]/g, "");

  if (/^04\d{8}$/.test(compact)) {
    return `+61${compact.slice(1)}`;
  }

  if (/^614\d{8}$/.test(compact)) {
    return `+${compact}`;
  }

  return compact;
}

export function isValidAustralianMobile(value: string) {
  return /^\+614\d{8}$/.test(normalizeAustralianMobile(value));
}

export function isValidDateOfBirth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const oldestYear = today.getUTCFullYear() - 120;

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date <= today &&
    year >= oldestYear;
}

export function isAtLeast18(value: string) {
  if (!isValidDateOfBirth(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  const eighteenthBirthday = new Date(Date.UTC(year + 18, month - 1, day));
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return eighteenthBirthday <= todayUtc;
}
