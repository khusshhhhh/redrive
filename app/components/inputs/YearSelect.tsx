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
                className={`peer w-full p-4 pt-6 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed
                            pl-4 appearance-none 
                            ${errors[id] ? "border-red-300" : "border-neutral-300"}
                            ${errors[id] ? "focus:border-red-200" : "focus:border-black"}
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
                    ${errors[id] ? "text-red-500" : "text-zinc-400"}
                    absolute
                `}
            >
                {label}
            </label>

            {errors[id] && (
                <p className="text-red-500 text-sm mt-1">
                    {label} is required
                </p>
            )}
        </div>
    );
};

export default YearSelect;
