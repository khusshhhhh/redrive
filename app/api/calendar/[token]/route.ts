import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import { buildIcs, type IcsEvent } from "@/app/libs/ical";
import prisma from "@/app/libs/prismadb";

type Context = { params: Promise<{ token: string }> };

// Personal, read-only calendar feed. The token in the URL is the only
// credential — subscribe to it from Google / Apple Calendar. Shows the user's
// trips as a guest and every booking on the listings they host, plus their own
// blocked dates.
async function GETHandler(_request: Request, context: Context) {
  const { token } = await context.params;
  const clean = token.replace(/\.ics$/i, "");
  if (!/^[a-f0-9-]{16,64}$/i.test(clean)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { icalToken: clean },
    select: { id: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const horizon = new Date(Date.now() - 90 * 86_400_000);
  const ownListings = await prisma.listing.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const ownListingIds = ownListings.map((listing) => listing.id);

  const [reservations, blocks] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        status: { in: ["APPROVED", "ACTIVE", "COMPLETED"] },
        endDate: { gte: horizon },
        OR: [{ userId: user.id }, { listingId: { in: ownListingIds } }],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        userId: true,
        user: { select: { name: true } },
        listing: { select: { title: true, userId: true, suburb: true } },
      },
      take: 500,
    }),
    ownListingIds.length
      ? prisma.availabilityBlock.findMany({
          where: { endDate: { gte: horizon }, listingId: { in: ownListingIds } },
          select: { id: true, startDate: true, endDate: true, reason: true, type: true, listingId: true },
          take: 500,
        })
      : Promise.resolve([]),
  ]);

  const events: IcsEvent[] = [];

  for (const reservation of reservations) {
    const asHost = reservation.listing.userId === user.id;
    const who = asHost ? reservation.user.name || "a guest" : "you";
    events.push({
      uid: `reservation-${reservation.id}@redrive`,
      start: reservation.startDate,
      end: new Date(reservation.endDate.getTime() + 86_400_000), // DTEND is exclusive
      allDay: true,
      summary: asHost
        ? `${reservation.listing.title} — booked (${who})`
        : `Trip: ${reservation.listing.title}`,
      description: `${asHost ? "Hosting" : "Renting"} · ${reservation.status.toLowerCase()} · ${reservation.listing.suburb ?? ""}. Manage: https://redrive.com.au/reservations/${reservation.id}`,
    });
  }

  for (const block of blocks) {
    events.push({
      uid: `block-${block.id}@redrive`,
      start: block.startDate,
      end: new Date(block.endDate.getTime() + 86_400_000),
      allDay: true,
      summary: block.type === "EXTERNAL_ICAL" ? `Blocked (external)` : `Blocked${block.reason ? `: ${block.reason}` : ""}`,
    });
  }

  const ics = buildIcs(`Redrive — ${user.name ?? "My bookings"}`, events);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="redrive.ics"',
      "cache-control": "private, max-age=900",
    },
  });
}

export const GET = monitorApiRoute("/api/calendar/[token]", GETHandler, "GET");
