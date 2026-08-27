export function hasCurrentVerifiedLicense(status?: string | null, expiresAt?: string | Date | null) {
  if (status !== "VERIFIED" || !expiresAt) return false;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isFinite(expiry.getTime()) && expiry.getTime() >= Date.now();
}
