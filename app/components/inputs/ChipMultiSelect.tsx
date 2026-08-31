"use client";

import type { FactItem } from "@/app/libs/vehicleFacts";

interface ChipMultiSelectProps {
  items: FactItem[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

/** Multi-select chip grid — same styling as the amenities grid in HostFlow.
 *  Used for safetyFeatures and languagesSpoken. */
const ChipMultiSelect: React.FC<ChipMultiSelectProps> = ({ items, selected, onToggle, disabled }) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onToggle(item.id)}
            className={`flex items-center gap-3 rounded-md border p-4 text-left text-sm font-medium transition
              ${active ? "border-ink bg-ink text-white" : "border-hairline text-ink hover:border-ink"}
              ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Icon size={22} stroke={1.8} />
            {item.name}
          </button>
        );
      })}
    </div>
  );
};

export default ChipMultiSelect;
