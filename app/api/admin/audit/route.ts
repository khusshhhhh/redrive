import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getAdminUser } from "@/app/libs/adminAuth";

async function GETHandler(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url); const action = url.searchParams.get("action") || undefined;
  const events = await prisma.auditEvent.findMany({ where: action ? { action } : undefined, orderBy: { createdAt: "desc" }, take: Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50)) });
  return NextResponse.json(events, { headers: { "Cache-Control": "private, no-store" } });
}

export const GET = monitorApiRoute("/api/admin/audit", GETHandler, "GET");
