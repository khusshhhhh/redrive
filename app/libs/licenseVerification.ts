export function hasSubmittedLicense(value?: string | null) {
  if (!value) return false;

  try {
    if (value.startsWith("/api/files/license?asset=")) return true;
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/image/upload/") &&
      url.pathname.includes("/redrive/licenses/");
  } catch {
    return false;
  }
}

export function hasCurrentVerifiedLicense(status?: string | null, expiresAt?: string | Date | null) {
  if (status !== "VERIFIED" || !expiresAt) return false;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isFinite(expiry.getTime()) && expiry.getTime() >= Date.now();
}
