import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getReusableLicence } from "@/app/libs/licenceReuse";

async function GETHandler() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reusable = await getReusableLicence(currentUser.id);
  if (!reusable) {
    return NextResponse.json({ available: false }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json(
    {
      available: true,
      source: reusable.source,
      name: reusable.name,
      detectedState: reusable.detectedState,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export const GET = monitorApiRoute("/api/reservations/reusable-licence", GETHandler, "GET");
