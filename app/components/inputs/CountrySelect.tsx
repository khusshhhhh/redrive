'use client';

import useCountries from "@/app/hooks/useCountries";
import Select from "react-select";
import { selectClassNames, selectStyles } from "./selectStyles";

export type CountrySelectValue = {
    flag: string;
    label: string;
    latlng: number[];
    region: string;
    value: string;
};

interface CountrySelectProps {
    value?: CountrySelectValue;
    onChange: (value: CountrySelectValue) => void;
}

const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange }) => {
    const { getAll } = useCountries();

    return (
        <div>
            <Select
                unstyled
                placeholder="Anywhere"
                isClearable
                options={getAll()}
                value={value}
                onChange={(value) => onChange(value as CountrySelectValue)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatOptionLabel={(option: any) => (
                    <div className="flex flex-row items-center gap-3 ml-3">
                        {/* <div>{option.flag}</div> */}
                        <div>
                            {option.label},
                            <span className="text-muted ml-1">
                                {option.region}
                            </span>
                        </div>
                    </div>
                )}
                classNames={selectClassNames}
                styles={selectStyles}
                menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
            />
        </div>
    );

};

export default CountrySelect;
