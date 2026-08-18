import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/app/libs/prismadb";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { SAVED_SEARCH_FREQUENCIES, type SavedSearchFrequency } from "@/app/libs/savedSearch";

async function userId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return (await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }))?.id || null;
}

export async function PATCH(request: Request, context: { params: Promise<{ searchId: string }> }) {
  const currentUserId = await userId();
  if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchId } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(searchId)) return NextResponse.json({ error: "Invalid saved search" }, { status: 400 });
  const existing = await prisma.savedSearch.findUnique({ where: { id: searchId } });
  if (!existing) return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
  if (existing.userId !== currentUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const frequency = SAVED_SEARCH_FREQUENCIES.includes(body.alertFrequency as SavedSearchFrequency)
    ? body.alertFrequency as SavedSearchFrequency
    : undefined;
  if (!frequency) return NextResponse.json({ error: "Choose Off, Daily or Weekly" }, { status: 400 });

  const updated = await prisma.savedSearch.update({
    where: { id: searchId },
    data: { alertFrequency: frequency, active: frequency !== "OFF", lastNotifiedAt: new Date() },
  });
  return NextResponse.json({
    ...updated,
    lastNotifiedAt: updated.lastNotifiedAt?.toISOString() || null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ searchId: string }> }) {
  const currentUserId = await userId();
  if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchId } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(searchId)) return NextResponse.json({ error: "Invalid saved search" }, { status: 400 });
  const existing = await prisma.savedSearch.findUnique({ where: { id: searchId } });
  if (!existing) return NextResponse.json({ success: true });
  if (existing.userId !== currentUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.savedSearch.delete({ where: { id: searchId } });
  return NextResponse.json({ success: true });
}
