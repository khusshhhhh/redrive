"use client";

import { FieldErrors, UseFormRegister } from "react-hook-form";
import { TbCurrencyDollarAustralian } from "react-icons/tb";

interface InputProps {
    id: string;
    label: string;
    type?: string;
    disabled?: boolean;
    formatPrice?: boolean;
    required?: boolean;
    value?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: UseFormRegister<any>;
    onChange?: React.ChangeEventHandler<HTMLInputElement>; // ✅ ADDED onChange PROP
    errors: FieldErrors;
    placeholder?: string;
    validate?: (value: string) => true | string; // ✅ ADDED validate PROP
    maxLength?: number; // ✅ Add maxLength support
}

const Input: React.FC<InputProps> = ({
    id,
    label,
    value,
    type = "text",
    disabled,
    formatPrice,
    register,
    required,
    errors,
    validate,
    onChange, // ✅ ADDED onChange PROP
    maxLength, // ✅ Add maxLength to destructured properties
}) => {
    return (
        <div className="w-full relative">
            {formatPrice && (
                <TbCurrencyDollarAustralian
                    size={24}
                    className="text-muted absolute top-5 left-2"
                />
            )}

            <input
                id={id}
                disabled={disabled}
                value={value}
                {...register(id, { required, validate })}
                placeholder=" "
                type={type}
                maxLength={maxLength} // ✅ Add maxLength support
                onChange={onChange} // ✅ Now handles input changes
                className={`peer w-full p-4 pt-6 font-normal bg-white text-ink border rounded-sm outline-none transition disabled:opacity-70 disabled:cursor-not-allowed
                             ${formatPrice ? "pl-9" : "pl-4"}
                             ${errors[id] ? "border-error" : "border-hairline"}
                             ${errors[id] ? "focus:border-error focus:border-2" : "focus:border-ink focus:border-2"}`}
            />
            <label
                className={`absolute text-body-md duration-150 transform -translate-y-3 top-5 z-10 origin-[0]
                    ${formatPrice ? 'left-9' : 'left-4'}
                    peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0
                    peer-focus:scale-75 peer-focus:-translate-y-4
                    ${errors[id] ? 'text-error' : 'text-muted'}`}
            >
                {label}
            </label>
        </div>
    );
};


export default Input;
