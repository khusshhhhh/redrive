import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { revokeAllMobileSessions } from "@/app/libs/mobile-auth/sessions";
import { mobileJson } from "@/app/libs/mobile-api/responses";
import { writeAuditEvent } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const result = await revokeAllMobileSessions(auth.identity.userId, "LOGOUT_ALL");
  await writeAuditEvent({ request, actorUserId: auth.identity.userId, action: "MOBILE_LOGOUT_ALL", targetType: "User", targetId: auth.identity.userId, metadata: { sessionsRevoked: result.count } });
  return mobileJson(request, { loggedOut: true, sessionsRevoked: result.count });
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/logout-all", POSTHandler, "POST");
