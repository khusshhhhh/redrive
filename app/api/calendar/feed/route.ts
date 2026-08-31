import crypto from "crypto";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { siteUrl } from "@/app/libs/siteUrl";

async function feedUrl(userId: string): Promise<string> {
  let user = await prisma.user.findUnique({ where: { id: userId }, select: { icalToken: true } });
  if (!user?.icalToken) {
    const token = crypto.randomUUID().replace(/-/g, "");
    user = await prisma.user.update({
      where: { id: userId },
      data: { icalToken: token },
      select: { icalToken: true },
    });
  }
  return `${siteUrl}/api/calendar/${user.icalToken}.ics`;
}

async function GETHandler() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { url: await feedUrl(currentUser.id) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

// Rotate the token — invalidates any existing subscriptions.
async function POSTHandler() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({
    where: { id: currentUser.id },
    data: { icalToken: crypto.randomUUID().replace(/-/g, "") },
  });
  return NextResponse.json({ url: await feedUrl(currentUser.id) });
}

export const GET = monitorApiRoute("/api/calendar/feed", GETHandler, "GET");
export const POST = monitorApiRoute("/api/calendar/feed", POSTHandler, "POST");
