'use client';

import { useState, useEffect } from "react";
import Select from "react-select";

interface SuburbSelectorProps {
    state?: string;
    value?: { value: string; label: string; postcode?: number };
    onChange: (value: { value: string; label: string; postcode?: number }) => void;
}

const SuburbSelector: React.FC<SuburbSelectorProps> = ({ state, value, onChange }) => {
    const [suburbs, setSuburbs] = useState<{ value: string; label: string; postcode?: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!state) {
            setSuburbs([]);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        // ✅ Load `test.Suburb.json` locally
        fetch("/test.Suburb.json")
            .then((response) => response.json())
            .then((data) => {
                // ✅ Filter suburbs by state
                const filteredSuburbs = data
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((suburb: any) => suburb.state === state)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((suburb: any) => ({
                        value: suburb.suburb,
                        label: `${suburb.suburb} ,${suburb.postcode}`,
                        postcode: suburb.postcode,
                    }))
                    // ✅ Sort suburbs alphabetically (A → Z)
                    .sort((a, b) => a.label.localeCompare(b.label));

                if (filteredSuburbs.length === 0) {
                    setError("No suburbs found for this state.");
                    setSuburbs([]);
                } else {
                    setSuburbs(filteredSuburbs);
                }
            })
            .catch((error) => {
                console.error("Error loading suburbs:", error);
                setError("Failed to load suburbs. Please try again.");
                setSuburbs([]);
            })
            .finally(() => {
                setLoading(false);
            });

    }, [state]);

    return (
        <div>
            <Select
                placeholder={loading ? "Loading suburbs..." : "Search a Suburb"}
                isClearable
                options={suburbs}
                value={value}
                onChange={(selectedOption) => {
                    if (selectedOption) {
                        onChange(selectedOption);
                    }
                }}
                classNames={{
                    control: () => 'p-3 border-2',
                    input: () => 'text-lg',
                    option: () => 'text-lg',
                }}
                theme={(theme) => ({
                    ...theme,
                    borderRadius: 6,
                    colors: {
                        ...theme.colors,
                        primary: 'black',
                        primary25: '#e3fcf9',
                    },
                })}
                isDisabled={!state || loading} // ✅ Disabled if no state selected
            />

            {/* ✅ Show error message if needed */}
            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </div>
    );
};

export default SuburbSelector;
