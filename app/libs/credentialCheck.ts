import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";

import prisma from "@/app/libs/prismadb";

/**
 * A valid bcrypt hash that no real password produces. Compared against when the
 * account is missing or password-less so the response time (and the code path)
 * doesn't reveal which emails have accounts.
 */
export const INVALID_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.yrW5YFq8p6x5YvZLR/R3hR0cD3.C7W.";

/**
 * Always runs one bcrypt comparison, whether or not `hashedPassword` is set, so
 * a missing account and a wrong password are indistinguishable by timing.
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string | null | undefined,
): Promise<boolean> {
  const matches = await bcrypt.compare(password, hashedPassword || INVALID_PASSWORD_HASH);
  return Boolean(hashedPassword) && matches;
}

export type CredentialCheckResult =
  | { ok: true; user: User }
  | { ok: false; user: User | null; reason: "INVALID_CREDENTIALS" };

/**
 * The single credential-check used by every password login surface (web
 * NextAuth, legacy `/api/auth/login`, mobile `/api/mobile/v1/auth/login`).
 *
 * It only decides "are these the right email + password". Email-verification
 * and login-OTP gating differ per surface and stay in the caller, which uses
 * the returned `user`.
 */
export async function checkCredentials(
  rawEmail: string,
  password: string,
): Promise<CredentialCheckResult> {
  const email = rawEmail.trim().toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const passwordOk = await verifyPassword(password, user?.hashedPassword);

  if (!user || !passwordOk) {
    return { ok: false, user: user ?? null, reason: "INVALID_CREDENTIALS" };
  }
  return { ok: true, user };
}
