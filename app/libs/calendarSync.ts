import { parseIcsBlocks } from "@/app/libs/ical";
import prisma from "@/app/libs/prismadb";

export interface SyncResult {
  ok: boolean;
  blocks: number;
  error?: string;
}

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BODY_BYTES = 4_000_000;

/**
 * Fetch one external iCal feed and mirror its busy blocks into the listing's
 * AvailabilityBlocks. Blocks from this feed are tagged `reason: "ical:<id>"`
 * so the sync fully owns them — anything no longer in the feed is removed.
 */
export async function syncOneCalendar(calendarId: string): Promise<SyncResult> {
  const calendar = await prisma.externalCalendar.findUnique({ where: { id: calendarId } });
  if (!calendar) return { ok: false, blocks: 0, error: "not found" };

  const tag = `ical:${calendarId}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(calendar.url, {
      signal: controller.signal,
      headers: { accept: "text/calendar, text/plain, */*" },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = (await response.text()).slice(0, MAX_BODY_BYTES);
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("not an iCalendar feed");

    const parsed = parseIcsBlocks(text);
    const now = new Date();
    // Only mirror current / future blocks — no point importing history.
    const future = parsed.filter((block) => block.end.getTime() > now.getTime() - 86_400_000).slice(0, 400);

    await prisma.$transaction([
      prisma.availabilityBlock.deleteMany({
        where: { listingId: calendar.listingId, type: "EXTERNAL_ICAL", reason: tag },
      }),
      prisma.availabilityBlock.createMany({
        data: future.map((block) => ({
          listingId: calendar.listingId,
          startDate: block.start,
          endDate: block.end,
          type: "EXTERNAL_ICAL",
          reason: tag,
          externalUid: block.uid.slice(0, 200),
        })),
      }),
    ]);

    await prisma.externalCalendar.update({
      where: { id: calendarId },
      data: { lastSyncedAt: now, lastStatus: "OK", lastError: null },
    });
    return { ok: true, blocks: future.length };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : "sync failed";
    await prisma.externalCalendar
      .update({ where: { id: calendarId }, data: { lastSyncedAt: new Date(), lastStatus: "ERROR", lastError: message } })
      .catch(() => undefined);
    return { ok: false, blocks: 0, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

/** Cron entry point — re-sync feeds not refreshed in the last ~50 minutes. */
export async function syncDueCalendars(now = new Date()): Promise<{ synced: number; failed: number }> {
  const due = await prisma.externalCalendar.findMany({
    where: {
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(now.getTime() - 50 * 60_000) } }],
    },
    select: { id: true },
    take: 100,
  });
  let synced = 0;
  let failed = 0;
  for (const calendar of due) {
    const result = await syncOneCalendar(calendar.id);
    if (result.ok) synced += 1;
    else failed += 1;
  }
  return { synced, failed };
}
