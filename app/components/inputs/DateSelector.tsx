'use client';

import { useState, useEffect } from "react";

interface DateSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DateSelector: React.FC<DateSelectorProps> = ({ value, onChange }) => {
    const today = new Date(); // Get today's date
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // JS months are 0-based

    const [day, setDay] = useState("");
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Generate year options (Current year to 20 years ahead)
    const years = Array.from({ length: 21 }, (_, i) => currentYear + i);

    // Dynamically get the number of days in a selected month & year
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate();
    };

    // Ensure day selection is valid when month/year changes
    useEffect(() => {
        if (day && month && year) {
            const monthIndex = months.indexOf(month) + 1; // Convert month name to number
            const daysInMonth = getDaysInMonth(parseInt(year), monthIndex);

            // Reset day if it exceeds the max days in the month
            if (parseInt(day) > daysInMonth) {
                setDay(daysInMonth.toString());
            }

            // Format date and send to parent component
            const formattedDate = `${year}-${String(monthIndex).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            onChange(formattedDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, year, month, onChange]);

    return (
        <div className="flex gap-2">
            {/* Day Dropdown */}
            <select value={day} onChange={(e) => setDay(e.target.value)} className="border p-4 rounded-md w-[33%]">
                <option value="">Day</option>
                {Array.from({ length: day && month && year ? getDaysInMonth(parseInt(year), months.indexOf(month) + 1) : 31 }, (_, i) => i + 1)
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
