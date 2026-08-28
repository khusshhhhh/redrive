'use client';

import Select from "react-select";
import { selectClassNames, selectStyles } from "./selectStyles";

export const states = [
    { value: "NSW", label: "New South Wales" },
    { value: "VIC", label: "Victoria" },
    { value: "QLD", label: "Queensland" },
    { value: "SA", label: "South Australia" },
    { value: "WA", label: "Western Australia" },
    { value: "TAS", label: "Tasmania" },
    { value: "NT", label: "Northern Territory" },
    { value: "ACT", label: "Australian Capital Territory" }
];

interface StateSelectorProps {
    value?: { value: string; label: string };
    onChange: (value: { value: string; label: string }) => void;
    onClear?: () => void;
    allowAnywhere?: boolean; // Add this line
    /** Portal the menu to <body>. Keep on inside modals; off in plain page flow. */
    portalMenu?: boolean;
}

const StateSelector: React.FC<StateSelectorProps> = ({ value, onChange, onClear, portalMenu = true }) => {
    return (
        <div>
            <Select
                unstyled
                placeholder="Select a State"
                isClearable
                options={states}
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
            />
        </div>
    );
};

export default StateSelector;
