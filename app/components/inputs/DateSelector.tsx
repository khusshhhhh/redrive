"use client";

import { useState, useEffect, useMemo } from "react";

interface DateSelectorProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DateSelector: React.FC<DateSelectorProps> = ({ value, onChange }) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const [day, setDay] = useState("");
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Generate year options (Current year to 20 years ahead)
    const years = useMemo(() => Array.from({ length: 21 }, (_, i) => currentYear + i), [currentYear]);

    // Function to get the number of days in a selected month/year
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate();
    };

    // Compute available days dynamically when month and year change
    const daysInMonth = useMemo(() => {
        if (!year || !month) return 31;
        return getDaysInMonth(parseInt(year), months.indexOf(month) + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month]);

    // Validate and update the selected day when month/year changes
    useEffect(() => {
        if (day && parseInt(day) > daysInMonth) {
            setDay(daysInMonth.toString());
        }

        if (day && month && year) {
            const monthIndex = months.indexOf(month) + 1;
            const formattedDate = `${year}-${String(monthIndex).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            onChange(formattedDate); // ✅ Only call `onChange` when the selected date is valid
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, year, month]); // ✅ Removed `onChange` from dependency array

    return (
        <div className="flex gap-2">
            {/* Day Dropdown */}
            <select value={day} onChange={(e) => setDay(e.target.value)} className="border p-4 rounded-md w-[33%]">
                <option value="">Day</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1)
                    .filter(d => !(parseInt(year) === currentYear && months.indexOf(month) + 1 === currentMonth && d < today.getDate())) // Disable past days
                    .map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
            </select>

            {/* Month Dropdown */}
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="border p-4 rounded-md w-[33%]">
                <option value="">Month</option>
                {months.map((m, index) => (
                    <option
                        key={m}
                        value={m}
                        disabled={parseInt(year) === currentYear && index + 1 < currentMonth} // Disable past months
                    >
                        {m}
                    </option>
                ))}
            </select>

            {/* Year Dropdown */}
            <select value={year} onChange={(e) => setYear(e.target.value)} className="border p-4 rounded-md w-[33%]">
                <option value="">Year</option>
                {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>
        </div>
    );
};

export default DateSelector;
