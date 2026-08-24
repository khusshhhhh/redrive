import crypto from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

import prisma from "@/app/libs/prismadb";
import { mobileAuthConfig } from "@/app/libs/mobile-auth/config";

type MobileAccessPayload = JwtPayload & { sub: string; sid: string };

export class MobileAccessTokenError extends Error {
  constructor(message = "Invalid mobile access token") {
    super(message);
    this.name = "MobileAccessTokenError";
  }
}

export function issueMobileAccessToken(userId: string, sessionId: string) {
  const config = mobileAuthConfig();
  const accessToken = jwt.sign(
    { sid: sessionId },
    config.privateKey,
    {
      algorithm: "RS256",
      keyid: config.keyId,
      issuer: config.issuer,
      audience: config.audience,
      subject: userId,
      jwtid: crypto.randomUUID(),
      expiresIn: config.accessTokenTtlSeconds,
    },
  );

  return {
    accessToken,
    accessTokenExpiresAt: new Date(Date.now() + config.accessTokenTtlSeconds * 1000),
  };
}

export async function verifyMobileAccessToken(token: string) {
  const config = mobileAuthConfig();
  const decoded = jwt.decode(token, { complete: true });
  const keyId = decoded?.header?.kid;
  if (!keyId || !config.publicKeys[keyId]) throw new MobileAccessTokenError();

  let payload: MobileAccessPayload;
  try {
    payload = jwt.verify(token, config.publicKeys[keyId], {
      algorithms: ["RS256"],
      issuer: config.issuer,
      audience: config.audience,
      clockTolerance: 5,
    }) as MobileAccessPayload;
  } catch {
    throw new MobileAccessTokenError();
  }

  if (!payload.sub || !payload.sid || !payload.iat) throw new MobileAccessTokenError();
  const [session, user] = await Promise.all([
    prisma.mobileSession.findUnique({ where: { id: payload.sid } }),
    prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, passwordChangedAt: true } }),
  ]);

  if (!session || !user || session.userId !== user.id || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new MobileAccessTokenError();
  }
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw new MobileAccessTokenError();
  }

  return { userId: user.id, sessionId: session.id, tokenFamilyId: session.tokenFamilyId };
}
