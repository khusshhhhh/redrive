import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";
import { listSavedCards } from "@/app/libs/stripeCustomer";

async function GETHandler() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ cards: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json(
    { cards: await listSavedCards(user.stripeCustomerId) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function DELETEHandler(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const methodId = new URL(request.url).searchParams.get("id") || "";
  if (!methodId.startsWith("pm_")) return NextResponse.json({ error: "Invalid card" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "No cards on file" }, { status: 404 });

  try {
    const method = await getStripe().paymentMethods.retrieve(methodId);
    if (method.customer !== user.stripeCustomerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await getStripe().paymentMethods.detach(methodId);
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error("Card detach failed", error);
    return NextResponse.json({ error: "Card could not be removed" }, { status: 502 });
  }
}

export const GET = monitorApiRoute("/api/payments/methods", GETHandler, "GET");
export const DELETE = monitorApiRoute("/api/payments/methods", DELETEHandler, "DELETE");
