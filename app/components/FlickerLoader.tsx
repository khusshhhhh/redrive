"use client";

import { FlickerSpinner } from "flicker-dot";

import { FLICKER_TONES, REDRIVE_FLICKER_GRIDS, type FlickerTone } from "@/app/libs/flickerGrids";

// flicker-dot calls useId to scope its keyframes, so it only runs in a client
// component. Wrapping it once keeps the grid data and the palette in one place
// instead of being repeated at every loading state.
export default function FlickerLoader({
  size = 44,
  tone = "primary",
  label,
  sublabel,
  className = "",
}: {
  size?: number;
  tone?: FlickerTone;
  /** Announced to assistive technology, and shown when it is worth reading. */
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const colors = FLICKER_TONES[tone];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <FlickerSpinner
        grids={REDRIVE_FLICKER_GRIDS}
        onColor={colors.on}
        offColor={colors.off}
        size={size}
        title={label || "Loading"}
      />
      {label ? (
        <p className="mt-4 text-body-sm font-semibold text-ink" aria-hidden="true">
          {label}
        </p>
      ) : null}
      {sublabel ? <p className="mt-1 text-caption-sm text-muted">{sublabel}</p> : null}
    </div>
  );
}
