"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bell, Mail, MessageSquare, Moon, RefreshCw, Smartphone } from "lucide-react";
import toast from "@/app/libs/toast";

type ChannelOverride = { email?: boolean; push?: boolean; sms?: boolean };

type Preferences = {
  notifyEmailEnabled: boolean;
  notifyPushEnabled: boolean;
  notifySmsEnabled: boolean;
  marketingEmailConsent: boolean;
  notificationPrefs: Record<string, ChannelOverride> | null;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  timezone: string | null;
  hasMobileNumber?: boolean;
};

// Activity-class events the user is allowed to mute per type. Transactional
// booking / payment / safety messages are intentionally not listed.
const MUTABLE_TYPES: { key: string; label: string; hint: string }[] = [
  { key: "REVIEW_RECEIVED", label: "New reviews on your listings", hint: "When a guest reviews a vehicle you host" },
  { key: "REVIEW_REMINDER", label: "Review reminders", hint: "A nudge to review a trip you finished" },
  { key: "MESSAGE_RECEIVED", label: "New messages", hint: "Email when you're offline and someone messages you" },
  { key: "PAYMENT_RECEIVED", label: "Payout confirmations", hint: "When funds are released to your bank" },
  { key: "BOOKING_COMPLETED", label: "Trip wrap-ups", hint: "A summary when a trip finishes" },
  { key: "SYSTEM_UPDATE", label: "Saved-search alerts & product news", hint: "New vehicles matching a saved search" },
];

const hourLabel = (hour: number) => {
  const period = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
};

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`group relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full border transition-colors duration-200 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-40
        ${checked ? "border-primary bg-primary" : "border-hairline bg-surface-strong"}`}
    >
      <span
        className={`pointer-events-none absolute left-[3px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(31,31,31,0.35)] transition-transform duration-200 ease-out
          ${checked ? "translate-x-[20px]" : "translate-x-0"}`}
      >
        <svg
          viewBox="0 0 12 12"
          className={`h-[9px] w-[9px] transition-opacity duration-150 ${checked ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        >
          <path
            d="M2.5 6.2 4.7 8.5 9.5 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />
        </svg>
      </span>
    </button>
  );
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    setLoading(true);
    setLoadError(false);
    axios
      .get<Preferences>("/api/notifications/preferences")
      .then((response) => setPrefs(response.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const patch = async (partial: Record<string, unknown>, optimistic: Partial<Preferences>) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...optimistic });
    setSaving(true);
    try {
      const response = await axios.patch<Preferences>("/api/notifications/preferences", partial);
      setPrefs((current) => ({ ...(current as Preferences), ...response.data }));
    } catch (error) {
      setPrefs(previous);
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Could not save that change"
          : "Could not save that change",
      );
    } finally {
      setSaving(false);
    }
  };

  const overrideFor = (key: string): ChannelOverride => prefs?.notificationPrefs?.[key] ?? {};

  const toggleTypeEmail = (key: string) => {
    const current = overrideFor(key);
    const nextEmail = !(current.email ?? true);
    const nextPrefs = {
      ...(prefs?.notificationPrefs ?? {}),
      [key]: { ...current, email: nextEmail },
    };
    void patch({ notificationPrefs: nextPrefs }, { notificationPrefs: nextPrefs });
  };

  const quietOn = prefs?.quietHoursStart != null && prefs?.quietHoursEnd != null;

  const detectedTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }, []);

  return (
    <section
      id="notifications"
      className="scroll-mt-32 rounded-md border border-hairline-soft bg-white p-5 sm:p-8"
    >
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink">
          <Bell size={19} />
        </div>
        <div>
          <h2 className="text-display-sm font-semibold text-ink">Notifications</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Choose how Redrive reaches you. Messages about a live booking, a payment or your
            account security are always sent.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton-wave h-40 rounded-md" />
      ) : loadError || !prefs ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-hairline-soft bg-surface-soft p-5 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-ink">Preferences are unavailable right now.</p>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-hairline bg-white px-4 text-sm font-semibold text-ink hover:bg-surface-soft"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Channels */}
          <div className="divide-y divide-hairline-soft rounded-md border border-hairline-soft">
            {[
              {
                icon: <Mail size={17} />,
                label: "Email",
                hint: "Booking updates, receipts and reminders",
                checked: prefs.notifyEmailEnabled,
                onChange: () =>
                  patch(
                    { notifyEmailEnabled: !prefs.notifyEmailEnabled },
                    { notifyEmailEnabled: !prefs.notifyEmailEnabled },
                  ),
              },
              {
                icon: <Smartphone size={17} />,
                label: "Push",
                hint: "Alerts on your phone through the Redrive app",
                checked: prefs.notifyPushEnabled,
                onChange: () =>
                  patch(
                    { notifyPushEnabled: !prefs.notifyPushEnabled },
                    { notifyPushEnabled: !prefs.notifyPushEnabled },
                  ),
              },
              {
                icon: <MessageSquare size={17} />,
                label: "SMS",
                hint: prefs.hasMobileNumber
                  ? "Only for time-critical alerts — a payment about to expire, an overdue return"
                  : "Add a mobile number to your profile to enable SMS",
                checked: prefs.notifySmsEnabled,
                disabled: !prefs.hasMobileNumber,
                onChange: () =>
                  patch(
                    { notifySmsEnabled: !prefs.notifySmsEnabled },
                    { notifySmsEnabled: !prefs.notifySmsEnabled },
                  ),
              },
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-5 p-5">
                <div className="flex gap-3">
                  <div className="mt-0.5 text-primary">{row.icon}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{row.label}</h3>
                    <p className="mt-1 max-w-md text-xs leading-5 text-muted">{row.hint}</p>
                  </div>
                </div>
                <Toggle
                  checked={row.checked}
                  disabled={row.disabled || saving}
                  onChange={row.onChange}
                  label={row.label}
                />
              </div>
            ))}
          </div>

          {/* Marketing consent */}
          <div className="flex items-start justify-between gap-5 rounded-md border border-hairline-soft p-5">
            <div>
              <h3 className="text-sm font-semibold text-ink">Tips, stories and offers</h3>
              <p className="mt-1 max-w-xl text-xs leading-5 text-muted">
                Occasional email about getting more from Redrive, host earnings and seasonal
                demand. Off by default. You can unsubscribe from any of these in one click.
              </p>
            </div>
            <Toggle
              checked={prefs.marketingEmailConsent}
              disabled={saving}
              onChange={() =>
                patch(
                  { marketingEmailConsent: !prefs.marketingEmailConsent },
                  { marketingEmailConsent: !prefs.marketingEmailConsent },
                )
              }
              label="Marketing email"
            />
          </div>

          {/* Per-type email mutes */}
          <div className="rounded-md border border-hairline-soft p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Email me about
            </p>
            <div className="mt-3 divide-y divide-hairline-soft">
              {MUTABLE_TYPES.map((type) => (
                <div key={type.key} className="flex items-center justify-between gap-5 py-3">
                  <div>
                    <p className="text-sm text-ink">{type.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted">{type.hint}</p>
                  </div>
                  <Toggle
                    checked={(overrideFor(type.key).email ?? true) && prefs.notifyEmailEnabled}
                    disabled={saving || !prefs.notifyEmailEnabled}
                    onChange={() => toggleTypeEmail(type.key)}
                    label={type.label}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quiet hours */}
          <div className="rounded-md border border-hairline-soft p-5">
            <div className="flex items-start justify-between gap-5">
              <div className="flex gap-3">
                <div className="mt-0.5 text-primary">
                  <Moon size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Quiet hours</h3>
                  <p className="mt-1 max-w-md text-xs leading-5 text-muted">
                    Hold non-urgent push and SMS overnight. Urgent safety and
                    payment-deadline alerts still come through.
                  </p>
                </div>
              </div>
              <Toggle
                checked={quietOn}
                disabled={saving}
                onChange={() =>
                  quietOn
                    ? patch(
                        { quietHoursStart: null, quietHoursEnd: null },
                        { quietHoursStart: null, quietHoursEnd: null },
                      )
                    : patch(
                        {
                          quietHoursStart: 22,
                          quietHoursEnd: 7,
                          timezone: prefs.timezone || detectedTz || "Australia/Adelaide",
                        },
                        {
                          quietHoursStart: 22,
                          quietHoursEnd: 7,
                          timezone: prefs.timezone || detectedTz || "Australia/Adelaide",
                        },
                      )
                }
                label="Quiet hours"
              />
            </div>
            {quietOn && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-hairline-soft pt-4 text-sm">
                <label className="flex items-center gap-2">
                  <span className="text-xs text-muted">From</span>
                  <select
                    value={prefs.quietHoursStart ?? 22}
                    disabled={saving}
                    onChange={(event) =>
                      patch(
                        { quietHoursStart: Number(event.target.value) },
                        { quietHoursStart: Number(event.target.value) },
                      )
                    }
                    className="rounded-sm border border-hairline bg-white px-2 py-1 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {hourLabel(hour)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-muted">To</span>
                  <select
                    value={prefs.quietHoursEnd ?? 7}
                    disabled={saving}
                    onChange={(event) =>
                      patch(
                        { quietHoursEnd: Number(event.target.value) },
                        { quietHoursEnd: Number(event.target.value) },
                      )
                    }
                    className="rounded-sm border border-hairline bg-white px-2 py-1 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {hourLabel(hour)}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-xs text-muted">
                  {prefs.timezone || detectedTz || "local time"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
