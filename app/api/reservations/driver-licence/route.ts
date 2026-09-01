import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { DriverLicenceUploadError, processDriverLicenceUpload } from "@/app/libs/driverLicenceUpload";
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";

export const runtime = "nodejs";

async function POSTHandler(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await consumeRateLimits([
    { scope: "driver-licence-user", identifier: currentUser.id, limit: 20, windowMs: 60 * 60_000 },
    { scope: "driver-licence-ip", identifier: getClientIp(request), limit: 40, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload the licence as form data" }, { status: 400 });
  }
  const front = form.get("front");
  const back = form.get("back");
  if (!(front instanceof File)) {
    return NextResponse.json({ error: "A photo of the front of the licence is required" }, { status: 400 });
  }

  try {
    const result = await processDriverLicenceUpload({
      userId: currentUser.id,
      front,
      back: back instanceof File ? back : null,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DriverLicenceUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Driver licence upload failed", error);
    return NextResponse.json({ error: "The licence could not be processed" }, { status: 500 });
  }
}

export const POST = monitorApiRoute("/api/reservations/driver-licence", POSTHandler, "POST");
