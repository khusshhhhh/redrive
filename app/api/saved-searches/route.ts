import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/app/libs/prismadb";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  cleanSavedSearchFilters,
  SAVED_SEARCH_FREQUENCIES,
  savedSearchFiltersToJson,
  type SavedSearchFrequency,
} from "@/app/libs/savedSearch";

async function authenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
}

const serialize = (search: {
  id: string; name: string; filters: unknown; alertFrequency: string; active: boolean;
  lastNotifiedAt: Date | null; createdAt: Date; updatedAt: Date;
}) => ({
  ...search,
  lastNotifiedAt: search.lastNotifiedAt?.toISOString() || null,
  createdAt: search.createdAt.toISOString(),
  updatedAt: search.updatedAt.toISOString(),
});

async function GETHandler() {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searches = await prisma.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return NextResponse.json(searches.map(serialize));
}

async function POSTHandler(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  const filters = cleanSavedSearchFilters(body.filters);
  const frequency = SAVED_SEARCH_FREQUENCIES.includes(body.alertFrequency as SavedSearchFrequency)
    ? body.alertFrequency as SavedSearchFrequency
    : "OFF";

  if (!name) return NextResponse.json({ error: "Give this search a short name" }, { status: 400 });
  if (Object.keys(filters).length === 0) return NextResponse.json({ error: "Choose at least one search filter" }, { status: 400 });

  const count = await prisma.savedSearch.count({ where: { userId: user.id } });
  if (count >= 20) return NextResponse.json({ error: "You can save up to 20 searches" }, { status: 409 });

  const search = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      name,
      filters: savedSearchFiltersToJson(filters),
      alertFrequency: frequency,
      active: frequency !== "OFF",
      lastNotifiedAt: new Date(),
    },
  });
  return NextResponse.json(serialize(search), { status: 201 });
}

export const GET = monitorApiRoute("/api/saved-searches", GETHandler, "GET");

export const POST = monitorApiRoute("/api/saved-searches", POSTHandler, "POST");
