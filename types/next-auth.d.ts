import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & { id?: string };
    webSessionId?: string;
    sessionInvalidReason?: "IDLE_TIMEOUT" | "ABSOLUTE_TIMEOUT" | "REVOKED" | "SESSION_NOT_FOUND";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    webSessionId?: string;
    sessionInvalidReason?: "IDLE_TIMEOUT" | "ABSOLUTE_TIMEOUT" | "REVOKED" | "SESSION_NOT_FOUND";
  }
}
