import { monitorApiRoute } from "@/app/libs/apiMonitoring";

import { DriverLicenceUploadError, processDriverLicenceUpload } from "@/app/libs/driverLicenceUpload";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileError, mobileJson, mobileUnexpectedError } from "@/app/libs/mobile-api/responses";
import { consumeRateLimits, getClientIp } from "@/app/libs/security";

export const runtime = "nodejs";

async function POSTHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;

  const rateLimit = await consumeRateLimits([
    { scope: "driver-licence-user", identifier: auth.identity.userId, limit: 20, windowMs: 60 * 60_000 },
    { scope: "driver-licence-ip", identifier: getClientIp(request), limit: 40, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) {
    return mobileError(request, 429, "RATE_LIMITED", "Too many licence uploads. Wait and try again.", undefined, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return mobileError(request, 400, "INVALID_UPLOAD", "Upload the licence as multipart form data.");
  }
  const front = form.get("front");
  const back = form.get("back");
  if (!(front instanceof File)) {
    return mobileError(request, 400, "LICENCE_FRONT_REQUIRED", "A photo of the front of the licence is required.");
  }

  try {
    const result = await processDriverLicenceUpload({
      userId: auth.identity.userId,
      front,
      back: back instanceof File ? back : null,
    });
    return mobileJson(request, result, 200, { "Cache-Control": "no-store" });
  } catch (error) {
    if (error instanceof DriverLicenceUploadError) {
      return mobileError(request, error.status, "LICENCE_UPLOAD_FAILED", error.message);
    }
    return mobileUnexpectedError(request, error, "Mobile driver licence upload failed");
  }
}

export const POST = monitorApiRoute("/api/mobile/v1/reservations/driver-licence", POSTHandler, "POST");
