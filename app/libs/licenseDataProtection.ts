import crypto from "crypto";

function encryptionKey() {
  const configured = process.env.LICENSE_DATA_ENCRYPTION_KEY?.trim();
  if (configured) {
    const decoded = Buffer.from(configured, "base64");
    if (decoded.length !== 32) {
      throw new Error("LICENSE_DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
    }
    return decoded;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("LICENSE_DATA_ENCRYPTION_KEY is required in production");
  }

  const developmentSecret = process.env.NEXTAUTH_SECRET;
  if (!developmentSecret) {
    throw new Error("Set LICENSE_DATA_ENCRYPTION_KEY before verifying licences");
  }
  return crypto.createHash("sha256").update(`redrive-licence:${developmentSecret}`).digest();
}

export function encryptLicenseValue(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${authTag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptLicenseValue(value: string) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Invalid encrypted licence value");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashLicenseValue(value: string) {
  const hmacKey = process.env.LICENSE_DATA_HMAC_KEY ||
    process.env.RATE_LIMIT_SECRET ||
    process.env.NEXTAUTH_SECRET;
  if (!hmacKey) throw new Error("Set LICENSE_DATA_HMAC_KEY before verifying licences");
  return crypto.createHmac("sha256", hmacKey).update(value).digest("hex");
}

export function lastFour(value: string) {
  return value.slice(-4);
}
