import assert from "node:assert/strict";
import test from "node:test";

import { missingLicenceConfiguration } from "./licenseVerificationConfig";

const configuredProduction = {
  NODE_ENV: "production",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "cloud",
  CLOUDINARY_API_KEY: "key",
  CLOUDINARY_API_SECRET: "secret",
  GOOGLE_CLOUD_VISION_API_KEY: "vision",
  LICENSE_DATA_ENCRYPTION_KEY: "encryption",
  LICENSE_DATA_HMAC_KEY: "hmac",
};

test("licence configuration accepts all required production variables", () => {
  assert.deepEqual(missingLicenceConfiguration(configuredProduction), []);
});

test("licence configuration reports the exact misspelled HMAC variable case", () => {
  const environment: Record<string, string> = { ...configuredProduction };
  delete environment.LICENSE_DATA_HMAC_KEY;
  environment.LICENSE_DATA_HMAC_KE = "misspelled";
  assert.deepEqual(missingLicenceConfiguration(environment), ["LICENSE_DATA_HMAC_KEY"]);
});

test("licence configuration permits the documented development fallback", () => {
  const environment: Record<string, string> = {
    ...configuredProduction,
    NODE_ENV: "development",
    NEXTAUTH_SECRET: "development-secret",
  };
  delete environment.LICENSE_DATA_ENCRYPTION_KEY;
  delete environment.LICENSE_DATA_HMAC_KEY;
  assert.deepEqual(missingLicenceConfiguration(environment), []);
});
