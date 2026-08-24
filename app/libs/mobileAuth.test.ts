import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { MobileAuthConfigurationError, mobileAuthConfig } from "./mobile-auth/config";
import { issueMobileAccessToken } from "./mobile-auth/tokens";

const variableNames = [
  "MOBILE_TOKEN_ISSUER",
  "MOBILE_TOKEN_AUDIENCE",
  "MOBILE_ACCESS_TOKEN_KEY_ID",
  "MOBILE_ACCESS_TOKEN_PRIVATE_KEY",
  "MOBILE_ACCESS_TOKEN_PUBLIC_KEYS",
  "MOBILE_REFRESH_TOKEN_PEPPER",
] as const;

function withAuthEnvironment(run: (publicKey: string) => void) {
  const previous = Object.fromEntries(variableNames.map((name) => [name, process.env[name]]));
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  Object.assign(process.env, {
    MOBILE_TOKEN_ISSUER: "https://api.redrive.test",
    MOBILE_TOKEN_AUDIENCE: "redrive-mobile-api",
    MOBILE_ACCESS_TOKEN_KEY_ID: "test-1",
    MOBILE_ACCESS_TOKEN_PRIVATE_KEY: privatePem,
    MOBILE_ACCESS_TOKEN_PUBLIC_KEYS: JSON.stringify({ "test-1": publicPem }),
    MOBILE_REFRESH_TOKEN_PEPPER: "test-pepper-with-at-least-thirty-two-bytes",
  });
  try {
    run(publicPem);
  } finally {
    for (const name of variableNames) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("mobile access tokens are RS256, key-selected, issuer/audience restricted, and short lived", () => {
  withAuthEnvironment((publicKey) => {
    const issued = issueMobileAccessToken("507f1f77bcf86cd799439011", "507f191e810c19729de860ea");
    const complete = jwt.decode(issued.accessToken, { complete: true });
    assert.equal(complete?.header.alg, "RS256");
    assert.equal(complete?.header.kid, "test-1");
    const payload = jwt.verify(issued.accessToken, publicKey, {
      algorithms: ["RS256"],
      issuer: "https://api.redrive.test",
      audience: "redrive-mobile-api",
    });
    assert.equal(typeof payload, "object");
    assert.equal((payload as JwtPayload).sub, "507f1f77bcf86cd799439011");
    assert.equal((payload as JwtPayload).sid, "507f191e810c19729de860ea");
    assert.ok(issued.accessTokenExpiresAt.getTime() - Date.now() <= 10 * 60_000);
  });
});

test("mobile auth refuses an active key id without a matching public key", () => {
  withAuthEnvironment(() => {
    process.env.MOBILE_ACCESS_TOKEN_KEY_ID = "missing-key";
    assert.throws(() => mobileAuthConfig(), MobileAuthConfigurationError);
  });
});
