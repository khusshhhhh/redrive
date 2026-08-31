"use client";

import type { Option } from "@/app/libs/vehicleFacts";

interface OptionSelectorProps {
  label?: string;
  options: Option[];
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  columns?: 2 | 3;
  allowDeselect?: boolean;
}

/**
 * Generic single-select button grid. Same visual language as DriveChainSelector /
 * FuelSelector — used for transmission, tyre condition, handover method, toll
 * handling, deposit hold, charge port, shower/toilet type, ANCAP rating, etc.
 */
const OptionSelector: React.FC<OptionSelectorProps> = ({
  label,
  options,
  value,
  onChange,
  disabled,
  columns = 2,
  allowDeselect = false,
}) => {
  return (
    <div className="w-full">
      {label && <label className="text-body-sm text-muted mb-2 block">{label}</label>}
      <div className={`grid gap-3 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(allowDeselect && selected ? "" : option.value)}
              className={`flex items-center justify-center gap-2 rounded-sm border px-4 py-3 text-center text-sm font-medium transition
                ${selected ? "border-ink bg-ink text-white" : "border-hairline text-ink"}
                ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-ink"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OptionSelector;
