"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, IdCard, Loader2, Plus, ShieldAlert, Trash2, Upload } from "lucide-react";

interface Check {
  frontPublicId: string;
  backPublicId: string | null;
  looksAustralian: boolean;
  detectedState: string | null;
  reason: string | null;
}

export interface DriverPayload {
  role: "PRIMARY" | "SECONDARY";
  name: string;
  frontPublicId: string;
  backPublicId: string | null;
}

interface DriverState {
  name: string;
  check: Check | null;
  uploading: boolean;
  error: string | null;
}

const empty = (): DriverState => ({ name: "", check: null, uploading: false, error: null });

async function analyse(front: File, back: File | null): Promise<Check> {
  const form = new FormData();
  form.append("front", front);
  if (back) form.append("back", back);
  const response = await fetch("/api/reservations/driver-licence", { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The licence could not be checked");
  return data as Check;
}

function DriverCard({
  title,
  state,
  onName,
  onCheck,
  onRemove,
}: {
  title: string;
  state: DriverState;
  onName: (value: string) => void;
  onCheck: (check: Check | null, uploading: boolean, error: string | null) => void;
  onRemove?: () => void;
}) {
  const frontRef = useRef<File | null>(null);
  const [frontName, setFrontName] = useState<string>("");

  const run = async (front: File | null, back: File | null) => {
    if (!front) return;
    frontRef.current = front;
    setFrontName(front.name);
    onCheck(null, true, null);
    try {
      const check = await analyse(front, back);
      onCheck(check, false, check.looksAustralian ? null : check.reason);
    } catch (error) {
      onCheck(null, false, error instanceof Error ? error.message : "Upload failed");
    }
  };

  const accepted = state.check?.looksAustralian;

  return (
    <div className="rounded-md border border-hairline-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-error"
          >
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>

      <label className="mt-3 block text-xs font-semibold text-ink">
        Full name (as printed on the licence)
        <input
          value={state.name}
          onChange={(event) => onName(event.target.value.slice(0, 120))}
          className="mt-1.5 h-11 w-full rounded-sm border border-hairline bg-white px-3 text-sm font-normal outline-none focus:border-primary"
          placeholder="e.g. Jordan Lee"
        />
      </label>

      <div className="mt-3">
        <p className="text-xs font-semibold text-ink">Driver licence photo</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border-strong px-3 text-xs font-semibold text-ink hover:bg-surface-soft">
            <Upload size={14} />
            {frontName ? "Replace front" : "Upload front of card"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const files = event.target.files;
                void run(files?.[0] ?? null, null);
              }}
            />
          </label>
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-sm border border-hairline px-3 text-xs font-semibold text-muted hover:bg-surface-soft">
            <Plus size={13} />
            Add back (optional)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={!frontRef.current}
              onChange={(event) => {
                const files = event.target.files;
                void run(frontRef.current, files?.[0] ?? null);
              }}
            />
          </label>
        </div>

        {state.uploading && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
            <Loader2 size={13} className="animate-spin" /> Checking the licence…
          </p>
        )}
        {!state.uploading && accepted && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <BadgeCheck size={14} />
            {state.check?.detectedState
              ? `${state.check.detectedState} driver licence detected`
              : state.check?.reason === "not-checked"
                ? "Licence uploaded"
                : "Australian driver licence detected"}
          </p>
        )}
        {!state.uploading && state.error && (
          <p className="mt-2 flex gap-1.5 text-xs leading-5 text-amber-800">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BookingDrivers({
  defaultName,
  onChange,
}: {
  defaultName?: string | null;
  onChange: (drivers: DriverPayload[], ready: boolean) => void;
}) {
  const [primary, setPrimary] = useState<DriverState>(() => ({ ...empty(), name: defaultName?.trim() || "" }));
  const [secondary, setSecondary] = useState<DriverState | null>(null);

  useEffect(() => {
    if (!primary.name && defaultName) setPrimary((p) => ({ ...p, name: defaultName.trim() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultName]);

  useEffect(() => {
    const drivers: DriverPayload[] = [];
    const primaryOk =
      primary.name.trim().length >= 2 && Boolean(primary.check?.looksAustralian && primary.check.frontPublicId);
    if (primaryOk && primary.check) {
      drivers.push({
        role: "PRIMARY",
        name: primary.name.trim(),
        frontPublicId: primary.check.frontPublicId,
        backPublicId: primary.check.backPublicId,
      });
    }
    let secondaryOk = true;
    if (secondary) {
      secondaryOk =
        secondary.name.trim().length >= 2 && Boolean(secondary.check?.looksAustralian && secondary.check.frontPublicId);
      if (secondaryOk && secondary.check) {
        drivers.push({
          role: "SECONDARY",
          name: secondary.name.trim(),
          frontPublicId: secondary.check.frontPublicId,
          backPublicId: secondary.check.backPublicId,
        });
      }
    }
    onChange(drivers, primaryOk && secondaryOk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary, secondary]);

  return (
    <section id="drivers" className="scroll-mt-28 rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
          <IdCard size={19} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">Who&rsquo;s driving?</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Upload a photo of each driver&rsquo;s licence. Redrive checks it reads as a current Australian licence, and
            the host of this vehicle can see it. Nobody else can.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <DriverCard
          title="Primary driver"
          state={primary}
          onName={(name) => setPrimary((p) => ({ ...p, name }))}
          onCheck={(check, uploading, error) => setPrimary((p) => ({ ...p, check, uploading, error }))}
        />

        {secondary ? (
          <DriverCard
            title="Second driver"
            state={secondary}
            onName={(name) => setSecondary((s) => (s ? { ...s, name } : s))}
            onCheck={(check, uploading, error) =>
              setSecondary((s) => (s ? { ...s, check, uploading, error } : s))
            }
            onRemove={() => setSecondary(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setSecondary(empty())}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-active"
          >
            <Plus size={15} /> Add a second driver
          </button>
        )}
      </div>
    </section>
  );
}
