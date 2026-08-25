export class MobileAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MobileAuthConfigurationError";
  }
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new MobileAuthConfigurationError(`${name} is not configured`);
  return value;
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

export function mobileAuthConfig() {
  const keyId = required("MOBILE_ACCESS_TOKEN_KEY_ID");
  const privateKey = normalizePem(required("MOBILE_ACCESS_TOKEN_PRIVATE_KEY"));
  let publicKeys: Record<string, string>;

  try {
    const parsed = JSON.parse(required("MOBILE_ACCESS_TOKEN_PUBLIC_KEYS"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    publicKeys = Object.fromEntries(
      Object.entries(parsed).map(([id, key]) => {
        if (typeof key !== "string" || !key.includes("PUBLIC KEY")) throw new Error(`invalid key ${id}`);
        return [id, normalizePem(key)];
      }),
    );
  } catch (error) {
    throw new MobileAuthConfigurationError(`MOBILE_ACCESS_TOKEN_PUBLIC_KEYS is invalid: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  if (!privateKey.includes("PRIVATE KEY")) {
    throw new MobileAuthConfigurationError("MOBILE_ACCESS_TOKEN_PRIVATE_KEY must contain a PEM private key");
  }
  if (!publicKeys[keyId]) {
    throw new MobileAuthConfigurationError("The active MOBILE_ACCESS_TOKEN_KEY_ID is missing from MOBILE_ACCESS_TOKEN_PUBLIC_KEYS");
  }

  return {
    issuer: required("MOBILE_TOKEN_ISSUER").replace(/\/$/, ""),
    audience: required("MOBILE_TOKEN_AUDIENCE"),
    keyId,
    privateKey,
    publicKeys,
    refreshTokenPepper: required("MOBILE_REFRESH_TOKEN_PEPPER"),
    accessTokenTtlSeconds: 10 * 60,
    refreshTokenTtlMs: 30 * 24 * 60 * 60_000,
  };
}

export function allowMobileAuthPreviews() {
  return process.env.NODE_ENV !== "production" && process.env.MOBILE_ALLOW_AUTH_PREVIEWS === "true";
}
