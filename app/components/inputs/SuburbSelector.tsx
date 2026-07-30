'use client';

import React, { useState, useEffect, memo } from "react";
import Select from "react-select";
import SuburbDataLoader from "@/app/libs/SuburbDataLoader";
import { selectClassNames, selectStyles } from "./selectStyles";

interface SuburbSelectorProps {
    state?: string;
    value?: { value: string; label: string; postcode?: number };
    onChange: (value: { value: string; label: string; postcode?: number }) => void;
}

const SuburbSelector: React.FC<SuburbSelectorProps> = memo(({ state, value, onChange }) => {
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

        const loadSuburbs = async () => {
            try {
                const dataLoader = SuburbDataLoader.getInstance();
                await dataLoader.loadData();
                const filteredSuburbs = dataLoader.getSuburbsByState(state);
                
                if (filteredSuburbs.length === 0) {
                    setError("No suburbs found for this state.");
                    setSuburbs([]);
                } else {
                    setSuburbs(filteredSuburbs);
                }
            } catch (error) {
                console.error("Error loading suburbs:", error);
                setError("Failed to load suburbs. Please try again.");
                setSuburbs([]);
            } finally {
                setLoading(false);
            }
        };

        loadSuburbs();
    }, [state]);

    return (
        <div>
            <Select
                unstyled
                placeholder={loading ? "Loading suburbs..." : "Search a Suburb"}
                isClearable
                options={suburbs}
                value={value}
                onChange={(selectedOption) => {
                    if (selectedOption) {
                        onChange(selectedOption);
                    }
                }}
                classNames={selectClassNames}
                styles={selectStyles}
                menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                isDisabled={!state || loading}
            />

            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </div>
    );
});

SuburbSelector.displayName = 'SuburbSelector';

export default SuburbSelector;
