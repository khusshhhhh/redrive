"use client";

import { FieldErrors, FieldValues, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";

interface YearSelectProps {
    id: string;
    label: string;
    disabled?: boolean;
    required?: boolean;
    register: UseFormRegister<FieldValues>;
    setValue: UseFormSetValue<FieldValues>;
    watch?: UseFormWatch<FieldValues>; // ✅ Make watch optional to prevent undefined error
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

    const selectedYear = watch ? watch(id) || "" : ""; // ✅ Ensure watch is available

    return (
        <div className="w-full relative">
            <select
                id={id}
                disabled={disabled}
                {...register(id, { required })}
                value={selectedYear}
                onChange={(e) => setValue(id, e.target.value)}
                className={`peer w-full p-4 pt-6 font-normal bg-white border rounded-sm outline-none transition disabled:opacity-70 disabled:cursor-not-allowed
                            pl-4 appearance-none
                            ${errors[id] ? "border-error" : "border-hairline"}
                            ${errors[id] ? "focus:border-error focus:border-2" : "focus:border-ink focus:border-2"}
                `}
            >
                <option value="" disabled hidden>Select Year</option>
                {years.map((year) => (
                    <option key={year} value={year}>
                        {year}
                    </option>
                ))}
            </select>

            <label
                className={`text-md duration-150 transform top-5 left-4 z-10 origin-[0]
                    peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0
                    peer-focus:scale-75 peer-focus:-translate-y-4
                    ${selectedYear ? "hidden" : ""}
                    ${errors[id] ? "text-error" : "text-muted"}
                    absolute
                `}
            >
                {label}
            </label>

            {errors[id] && (
                <p className="text-error text-sm mt-1">
                    {label} is required
                </p>
            )}
        </div>
    );
};

export default YearSelect;
