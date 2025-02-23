'use client';

import Select from "react-select";

const states = [
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
}

const StateSelector: React.FC<StateSelectorProps> = ({ value, onChange }) => {
    return (
        <div>
            <Select
                placeholder="Select a State"
                isClearable
                options={states}
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
            />
        </div>
    );
};

export default StateSelector;
