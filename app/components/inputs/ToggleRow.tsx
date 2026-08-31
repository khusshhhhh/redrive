"use client";

interface ToggleRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Labelled yes/no switch row — matches the Counter.tsx layout. Used for the
 *  many boolean listing fields (interstate allowed, pets allowed, spare tyre…). */
const ToggleRow: React.FC<ToggleRowProps> = ({ title, subtitle, value, onChange, disabled }) => {
  return (
    <div className="flex flex-row items-center justify-between gap-4 py-1">
      <div className="flex flex-col">
        <div className="font-medium text-ink">{title}</div>
        {subtitle && <div className="text-sm font-normal text-muted">{subtitle}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors
          ${value ? "border-ink bg-ink" : "border-hairline bg-surface-soft"}
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all
            ${value ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
};

export default ToggleRow;
