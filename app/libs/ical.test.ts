import assert from "node:assert/strict";
import test from "node:test";

import { buildIcs, parseIcsBlocks } from "./ical";

test("buildIcs produces a valid all-day VEVENT", () => {
  const ics = buildIcs("Redrive — My ute", [
    {
      uid: "res-123@redrive",
      start: new Date(Date.UTC(2026, 8, 1)),
      end: new Date(Date.UTC(2026, 8, 4)),
      summary: "Booked: Jane D",
      allDay: true,
    },
  ]);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260901/);
  assert.match(ics, /DTEND;VALUE=DATE:20260904/);
  assert.match(ics, /SUMMARY:Booked: Jane D/);
  assert.match(ics, /UID:res-123@redrive/);
  assert.ok(ics.endsWith("\r\n"));
});

test("parseIcsBlocks reads plain date-range events", () => {
  const feed = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:abc-1",
    "DTSTART;VALUE=DATE:20260910",
    "DTEND;VALUE=DATE:20260912",
    "SUMMARY:Airbnb (Not available)",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:abc-2",
    "DTSTART:20260920T090000Z",
    "DTEND:20260921T170000Z",
    "SUMMARY:Service",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blocks = parseIcsBlocks(feed);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].uid, "abc-1");
  assert.equal(blocks[0].start.getTime(), Date.UTC(2026, 8, 10));
  assert.equal(blocks[1].summary, "Service");
});

test("parseIcsBlocks skips recurring events and zero-length ranges", () => {
  const feed = [
    "BEGIN:VEVENT",
    "UID:r-1",
    "DTSTART;VALUE=DATE:20260901",
    "DTEND;VALUE=DATE:20260902",
    "RRULE:FREQ=WEEKLY",
    "SUMMARY:Weekly",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:z-1",
    "DTSTART;VALUE=DATE:20260901",
    "DTEND;VALUE=DATE:20260901",
    "SUMMARY:Zero",
    "END:VEVENT",
  ].join("\n");
  assert.equal(parseIcsBlocks(feed).length, 0);
});

test("parseIcsBlocks unfolds wrapped lines", () => {
  const feed =
    "BEGIN:VEVENT\r\nUID:w-1\r\nDTSTART;VALUE=DATE:20260901\r\nDTEND;VALUE=DATE:20260903\r\nSUMMARY:A very long summary that the\r\n  exporter folded across lines\r\nEND:VEVENT";
  const blocks = parseIcsBlocks(feed);
  assert.equal(blocks.length, 1);
  assert.match(blocks[0].summary, /folded across lines/);
});
