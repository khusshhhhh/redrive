import { NextResponse } from "next/server";
import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import getSessionUser from "@/app/actions/getSessionUser";

// Client-side session hydration endpoint. The root layout no longer fetches the
// current user server-side (that forced every route to be dynamically rendered),
// so `CurrentUserProvider` calls this once on mount to populate the navbar,
// footer, mobile nav and presence/idle guards. Returns the minimal SessionUser
// projection — licence data, address and security flags stay server-side.
export const dynamic = "force-dynamic";

async function GETHandler() {
  const currentUser = await getSessionUser();

  return NextResponse.json(
    { currentUser },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = monitorApiRoute("/api/me", GETHandler, "GET");
