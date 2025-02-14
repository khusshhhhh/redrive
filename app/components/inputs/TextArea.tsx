"use client";

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";

interface TextAreaProps {
    id: string;
    label: string;
    disabled?: boolean;
    required?: boolean;
    register: UseFormRegister<FieldValues>;
    errors: FieldErrors;
}

const TextArea: React.FC<TextAreaProps> = ({
    id,
    label,
    disabled,
    register,
    required,
    errors,
}) => {
    return (
        <div className="w-full relative">
            <textarea
                id={id}
                disabled={disabled}
                {...register(id, { required })}
                placeholder=" "
                rows={8} // Allows for a larger input area
                className={`peer w-full p-4 pt-6 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed
                             pl-4 resize-none
                             ${errors[id] ? "border-red-300" : "border-neutral-300"}
                             ${errors[id] ? "focus:border-red-200" : "focus:border-black"}
                `}
            />
            <label
                className={`
                    text-md
                    duration-150
                    transform
                    -translate-y-3
                    top-5
                    z-10
                    left-4
                    peer-placeholder-shown:scale-100
                    peer-placeholder-shown:translate-y-0
                    peer-focus:scale-75
                    peer-focus:-translate-y-4
                    ${errors[id] ? "text-red-500" : "text-zinc-400"}
                    absolute
                `}
            >
                {label}
            </label>
        </div>
    );
};

export default TextArea;
