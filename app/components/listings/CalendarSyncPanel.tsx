"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { CalendarClock, Check, Copy, Link2, RefreshCw, Trash2 } from "lucide-react";

import toast from "@/app/libs/toast";

interface ExternalCalendar {
  id: string;
  url: string;
  label: string | null;
  lastSyncedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
}

export default function CalendarSyncPanel({ listingId }: { listingId: string }) {
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCalendars = useCallback(() => {
    axios
      .get<ExternalCalendar[]>(`/api/listings/${listingId}/calendars`)
      .then((response) => setCalendars(response.data))
      .catch(() => undefined);
  }, [listingId]);

  useEffect(() => {
    axios.get<{ url: string }>("/api/calendar/feed").then((response) => setFeedUrl(response.data.url)).catch(() => undefined);
    loadCalendars();
  }, [loadCalendars]);

  const copyFeed = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy — select and copy the link manually");
    }
  };

  const addCalendar = async () => {
    if (!newUrl.trim()) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/listings/${listingId}/calendars`, {
        url: newUrl.trim(),
        label: newLabel.trim() || undefined,
      });
      toast.success(
        data.sync?.ok
          ? `Added — ${data.sync.blocks} date${data.sync.blocks === 1 ? "" : "s"} blocked`
          : "Added — first sync will run shortly",
      );
      setNewUrl("");
      setNewLabel("");
      loadCalendars();
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Could not add that calendar"
          : "Could not add that calendar",
      );
    } finally {
      setBusy(false);
    }
  };

  const removeCalendar = async (id: string) => {
    try {
      await axios.delete(`/api/listings/${listingId}/calendars?id=${id}`);
      loadCalendars();
    } catch {
      toast.error("Could not remove that calendar");
    }
  };

  return (
    <div className="rounded-xl border border-hairline-soft bg-white p-5 shadow-[0_8px_28px_rgba(22,22,22,0.045)] sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink">
          <CalendarClock size={19} />
        </span>
        <div>
          <h3 className="text-base font-semibold text-ink">Calendar sync</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            Keep this vehicle from being double-booked across platforms.
          </p>
        </div>
      </div>

      {/* Export */}
      <div className="mt-5 rounded-md border border-hairline-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Add Redrive to your calendar
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Subscribe to this link in Google or Apple Calendar to see your Redrive bookings and blocked
          dates. Keep it private — anyone with the link can see your booking dates.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={feedUrl ?? "Loading…"}
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 rounded-sm border border-hairline bg-surface-soft px-2 py-1.5 text-xs text-muted"
          />
          <button
            type="button"
            onClick={copyFeed}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-hairline px-2.5 text-xs font-semibold text-ink hover:bg-surface-soft"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="mt-4 rounded-md border border-hairline-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Block dates from another calendar
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Paste an iCal / .ics export URL from Airbnb, Camplify, Google Calendar or similar. Those
          busy dates become unavailable on Redrive. Synced hourly.
        </p>

        {calendars.length > 0 && (
          <ul className="mt-3 space-y-2">
            {calendars.map((calendar) => (
              <li
                key={calendar.id}
                className="flex items-center justify-between gap-3 rounded-sm bg-surface-soft px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    <Link2 size={13} className="shrink-0" />
                    {calendar.label || new URL(calendar.url).hostname}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {calendar.lastStatus === "ERROR"
                      ? `Last sync failed: ${calendar.lastError}`
                      : calendar.lastSyncedAt
                        ? `Synced ${new Date(calendar.lastSyncedAt).toLocaleString("en-AU")}`
                        : "Not synced yet"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCalendar(calendar.id)}
                  aria-label="Remove calendar"
                  className="shrink-0 rounded-sm p-1.5 text-muted hover:bg-white hover:text-error"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            placeholder="https://…/calendar.ics"
            className="min-w-0 flex-1 rounded-sm border border-hairline bg-white px-2 py-1.5 text-sm"
          />
          <input
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value.slice(0, 60))}
            placeholder="Label (optional)"
            className="w-full rounded-sm border border-hairline bg-white px-2 py-1.5 text-sm sm:w-40"
          />
          <button
            type="button"
            disabled={busy || !newUrl.trim()}
            onClick={addCalendar}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? <RefreshCw size={13} className="animate-spin" /> : null} Add calendar
          </button>
        </div>
      </div>
    </div>
  );
}
