'use client';

import React, { useState, useEffect, memo } from "react";
import Select from "react-select";
import SuburbDataLoader from "@/app/libs/SuburbDataLoader";
import { selectClassNames, selectStyles } from "./selectStyles";

export interface SuburbOption {
    value: string;
    label: string;
    postcode?: number;
    state?: string;
}

interface SuburbSelectorProps {
    state?: string;
    value?: SuburbOption;
    onChange: (value: SuburbOption) => void;
    onClear?: () => void;
    allowAllStates?: boolean;
    /** Portal the menu to <body>. Keep on inside modals; off in plain page flow. */
    portalMenu?: boolean;
}

const SuburbSelector: React.FC<SuburbSelectorProps> = memo(({ state, value, onChange, onClear, allowAllStates = false, portalMenu = true }) => {
    const [suburbs, setSuburbs] = useState<SuburbOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!state && !allowAllStates) {
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
                const filteredSuburbs = allowAllStates
                    ? dataLoader.getAllSuburbs()
                    : dataLoader.getSuburbsByState(state!);
                
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
    }, [state, allowAllStates]);

    return (
        <div>
            <Select
                unstyled
                placeholder={loading ? "Loading suburbs..." : "Search suburb or postcode"}
                isClearable
                options={suburbs}
                value={value}
                onChange={(selectedOption) => {
                    if (selectedOption) {
                        onChange(selectedOption);
                    } else {
                        onClear?.();
                    }
                }}
                classNames={selectClassNames}
                styles={selectStyles}
                menuPortalTarget={portalMenu && typeof window !== "undefined" ? document.body : undefined}
                isDisabled={(!state && !allowAllStates) || loading}
            />

            {error && <p className="text-error mt-2 text-sm">{error}</p>}
        </div>
    );
});

SuburbSelector.displayName = 'SuburbSelector';

export default SuburbSelector;
