"use client";

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";

interface TextAreaProps {
  id: string;
  label: string;
  disabled?: boolean;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
  placeholder?: string;
}

const TextArea: React.FC<TextAreaProps> = ({
  id,
  label,
  disabled,
  register,
  required,
  errors,
  placeholder,
}) => {
  const error = errors[id];

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className={`mb-1.5 block text-xs font-medium ${error ? "text-error" : "text-muted"}`}
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        disabled={disabled}
        {...register(id, { required })}
        placeholder={placeholder}
        rows={8}
        aria-invalid={Boolean(error)}
        className={`w-full resize-none rounded-sm border bg-white p-4 text-base font-normal text-ink outline-none transition placeholder:text-sm placeholder:text-muted-soft disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70
          ${error ? "border-error focus:border-error focus:ring-1 focus:ring-error" : "border-hairline focus:border-ink focus:ring-1 focus:ring-ink"}`}
      />
      {error && (
        <p className="mt-1.5 text-xs text-error">
          {String(error.message || `${label || "This field"} is required`)}
        </p>
      )}
    </div>
  );
};

export default TextArea;
