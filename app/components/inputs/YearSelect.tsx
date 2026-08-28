"use client";

import { FieldErrors, FieldValues, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";

interface YearSelectProps {
    id: string;
    label: string;
    disabled?: boolean;
    required?: boolean;
    register: UseFormRegister<FieldValues>;
    setValue: UseFormSetValue<FieldValues>;
    watch?: UseFormWatch<FieldValues>;
    errors: FieldErrors;
}

const YearSelect: React.FC<YearSelectProps> = ({
    id,
    label,
    disabled,
    register,
    setValue,
    watch,
    required,
    errors,
}) => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i); // Last 100 years

    const selectedYear = watch ? watch(id) || "" : "";

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className={`mb-1.5 block text-xs font-medium ${errors[id] ? "text-error" : "text-muted"}`}>
                    {label}
                </label>
            )}
            <select
                id={id}
                disabled={disabled}
                {...register(id, { required })}
                value={selectedYear}
                onChange={(e) => setValue(id, e.target.value)}
                aria-invalid={Boolean(errors[id])}
                className={`h-12 w-full appearance-none rounded-sm border bg-white px-4 text-base font-normal text-ink outline-none transition disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70
                            ${errors[id] ? "border-error" : "border-hairline"}
                            ${errors[id] ? "focus:border-error focus:ring-1 focus:ring-error" : "focus:border-ink focus:ring-1 focus:ring-ink"}
                `}
            >
                <option value="" disabled>Select a year</option>
                {years.map((year) => (
                    <option key={year} value={year}>
                        {year}
                    </option>
                ))}
            </select>

            {errors[id] && (
                <p className="mt-1.5 text-xs text-error">
                    {String(errors[id]?.message || `${label || "Year"} is required`)}
                </p>
            )}
        </div>
    );
};

export default YearSelect;
