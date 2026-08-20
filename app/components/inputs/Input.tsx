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
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  errors: FieldErrors;
  placeholder?: string;
  validate?: (value: string) => true | string;
  maxLength?: number;
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
  onChange,
  maxLength,
  placeholder,
}) => {
  const { onChange: registerOnChange, ...registered } = register(id, {
    required,
    validate,
  });
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
      <div className="relative">
        {formatPrice && (
          <TbCurrencyDollarAustralian
            size={21}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
        )}
        <input
          id={id}
          disabled={disabled}
          value={value}
          {...registered}
          placeholder={placeholder}
          type={type}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            registerOnChange(event);
            onChange?.(event);
          }}
          className={`h-12 w-full rounded-sm border bg-white px-4 text-base font-normal text-ink outline-none transition placeholder:text-sm placeholder:text-muted-soft disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70
            ${formatPrice ? "pl-10" : "pl-4"}
            ${error ? "border-error focus:border-error focus:ring-1 focus:ring-error" : "border-hairline focus:border-ink focus:ring-1 focus:ring-ink"}`}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-error">
          {String(error.message || `${label || "This field"} is required`)}
        </p>
      )}
    </div>
  );
};

export default Input;
