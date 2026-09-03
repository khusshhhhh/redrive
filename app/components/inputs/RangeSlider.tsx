"use client";

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  ariaLabelMin?: string;
  ariaLabelMax?: string;
}

// Dual-thumb range built from two overlaid native <input type="range">s — no
// dependency. The track sits behind both; only the thumbs take pointer events
// (see `.range-thumb` in globals.css) so each handle stays draggable.
export default function RangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  ariaLabelMin = "Minimum",
  ariaLabelMax = "Maximum",
}: RangeSliderProps) {
  const [lo, hi] = value;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="relative h-6 w-full">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-hairline" />
      <div
        className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink"
        style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
      />
      <input
        type="range"
        className="range-thumb absolute inset-x-0 top-0 h-6 w-full"
        min={min}
        max={max}
        step={step}
        value={lo}
        aria-label={ariaLabelMin}
        onChange={(event) => {
          const next = Math.min(Number(event.target.value), hi - step);
          onChange([next, hi]);
        }}
      />
      <input
        type="range"
        className="range-thumb absolute inset-x-0 top-0 h-6 w-full"
        min={min}
        max={max}
        step={step}
        value={hi}
        aria-label={ariaLabelMax}
        onChange={(event) => {
          const next = Math.max(Number(event.target.value), lo + step);
          onChange([lo, next]);
        }}
      />
    </div>
  );
}
