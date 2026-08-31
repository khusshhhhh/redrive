// Minimal iCalendar (RFC 5545) read/write. Enough for vehicle-share calendars,
// which export plain date-range VEVENTs — no RRULE, no timezones beyond UTC.

export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  /** All-day (DATE value) vs timed (DATE-TIME). */
  allDay?: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold long lines to 75 octets per RFC 5545. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  return parts.join("\r\n");
}

export function buildIcs(calendarName: string, events: IcsEvent[]): string {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Redrive//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeText(event.uid)}`);
    lines.push(`DTSTAMP:${formatUtc(now)}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(event.start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDate(event.end)}`);
    } else {
      lines.push(`DTSTART:${formatUtc(event.start)}`);
      lines.push(`DTEND:${formatUtc(event.end)}`);
    }
    lines.push(`SUMMARY:${escapeText(event.summary)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  // Fold each logical line once, at the end.
  return lines.map(fold).join("\r\n") + "\r\n";
}

function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function parseIcsDate(raw: string): { date: Date; allDay: boolean } | null {
  const value = raw.trim();
  // DATE:  20260901
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return {
      date: new Date(Date.UTC(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3])),
      allDay: true,
    };
  }
  // DATE-TIME: 20260901T090000Z  or  20260901T090000
  const dateTime = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (dateTime) {
    return {
      date: new Date(
        Date.UTC(+dateTime[1], +dateTime[2] - 1, +dateTime[3], +dateTime[4], +dateTime[5], +dateTime[6]),
      ),
      allDay: false,
    };
  }
  return null;
}

export interface ParsedBlock {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
}

/**
 * Pull plain date-range busy blocks out of an iCal feed. VEVENTs with an RRULE
 * are skipped (out of scope) and malformed events are ignored.
 */
export function parseIcsBlocks(text: string): ParsedBlock[] {
  const body = unfold(text);
  const blocks: ParsedBlock[] = [];
  const eventChunks = body.split(/BEGIN:VEVENT/i).slice(1);
  for (const chunk of eventChunks) {
    const event = chunk.split(/END:VEVENT/i)[0];
    if (/^RRULE:/im.test(event)) continue;

    const get = (prop: string) => {
      const match = event.match(new RegExp(`^${prop}[^:\\r\\n]*:(.+)$`, "im"));
      return match ? match[1].trim() : null;
    };
    const rawStart = get("DTSTART");
    const rawEnd = get("DTEND") || get("DUE");
    const uid = get("UID") || `${rawStart}-${rawEnd}`;
    const summary = get("SUMMARY") || "Busy";
    if (!rawStart) continue;

    const start = parseIcsDate(rawStart);
    let end = rawEnd ? parseIcsDate(rawEnd) : null;
    if (!start) continue;
    if (!end) {
      // No DTEND — treat as a single day.
      end = { date: new Date(start.date.getTime() + 86_400_000), allDay: start.allDay };
    }
    if (end.date <= start.date) continue;
    blocks.push({ uid, start: start.date, end: end.date, summary: summary.slice(0, 200) });
  }
  return blocks;
}
