import { refreshRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileAuthErrorResponse } from "@/app/libs/mobile-auth/route-utils";
import { rotateMobileSession } from "@/app/libs/mobile-auth/sessions";
import { mobileError, mobileJson, mobileUnexpectedError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import { consumeRateLimits, getClientIp } from "@/app/libs/security";

async function POSTHandler(request: Request) {
  const parsed = await parseMobileJson(request, refreshRequestSchema);
  if (!parsed.ok) return parsed.response;
  const rateLimit = await consumeRateLimits([{ scope: "mobile-refresh-ip", identifier: getClientIp(request), limit: 120, windowMs: 15 * 60_000 }]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many refresh attempts. Sign in again shortly.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });
  try {
    return mobileJson(request, await rotateMobileSession(parsed.data.refreshToken, request));
  } catch (error) {
    return mobileAuthErrorResponse(request, error) || mobileUnexpectedError(request, error, "Mobile refresh failed");
  }
}

export const POST = monitorApiRoute("/api/mobile/v1/auth/refresh", POSTHandler, "POST");
