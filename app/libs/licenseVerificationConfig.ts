const providerVariables = [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GOOGLE_CLOUD_VISION_API_KEY",
] as const;

type LicenceEnvironment = Partial<Record<
  | (typeof providerVariables)[number]
  | "LICENSE_DATA_ENCRYPTION_KEY"
  | "LICENSE_DATA_HMAC_KEY"
  | "NEXTAUTH_SECRET"
  | "NODE_ENV",
  string
>>;

function isPresent(value?: string) {
  return Boolean(value?.trim());
}

function isGoogleApiKey(value?: string) {
  return /^AIza[0-9A-Za-z_-]{35}$/.test(value?.trim() || "");
}

export function missingLicenceConfiguration(
  environment: LicenceEnvironment = process.env,
) {
  const missing: string[] = providerVariables.filter((name) => !isPresent(environment[name]));
  if (
    isPresent(environment.GOOGLE_CLOUD_VISION_API_KEY) &&
    !isGoogleApiKey(environment.GOOGLE_CLOUD_VISION_API_KEY)
  ) {
    missing.push("GOOGLE_CLOUD_VISION_API_KEY_INVALID");
  }
  const hasEncryptionKey = isPresent(environment.LICENSE_DATA_ENCRYPTION_KEY);
  const hasHmacKey = isPresent(environment.LICENSE_DATA_HMAC_KEY);
  const canUseDevelopmentFallback =
    environment.NODE_ENV !== "production" && isPresent(environment.NEXTAUTH_SECRET);

  if (!canUseDevelopmentFallback) {
    if (!hasEncryptionKey) missing.push("LICENSE_DATA_ENCRYPTION_KEY");
    if (!hasHmacKey) missing.push("LICENSE_DATA_HMAC_KEY");
  }

  return missing;
}
