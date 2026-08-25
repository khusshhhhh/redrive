import { logoutRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { optionalIdentity } from "@/app/libs/mobile-auth/identity";
import { mobileAuthErrorResponse } from "@/app/libs/mobile-auth/route-utils";
import { revokeMobileSessionByRefreshToken, revokeMobileTokenFamily } from "@/app/libs/mobile-auth/sessions";
import { mobileJson, mobileUnexpectedError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import { writeAuditEvent } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const parsed = await parseMobileJson(request, logoutRequestSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const identity = await optionalIdentity(request);
    const revoked = parsed.data.refreshToken
      ? await revokeMobileSessionByRefreshToken(parsed.data.refreshToken, "LOGOUT")
      : identity?.method === "mobile-access-token" && identity.tokenFamilyId
        ? (await revokeMobileTokenFamily(identity.tokenFamilyId, "LOGOUT"), { userId: identity.userId, id: identity.sessionId })
        : null;
    if (revoked) await writeAuditEvent({ request, actorUserId: revoked.userId, action: "MOBILE_LOGOUT", targetType: "MobileSession", targetId: revoked.id });
    return mobileJson(request, { loggedOut: true });
  } catch (error) {
    return mobileAuthErrorResponse(request, error) || mobileUnexpectedError(request, error, "Mobile logout failed");
  }
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/logout", POSTHandler, "POST");
