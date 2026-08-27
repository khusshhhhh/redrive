"use client";

import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

const getPasswordChecks = (value = "") => [
  { label: "8+ characters", valid: value.length >= 8 },
  { label: "Uppercase", valid: /[A-Z]/.test(value) },
  { label: "Lowercase", valid: /[a-z]/.test(value) },
  { label: "Number", valid: /[0-9]/.test(value) },
  { label: "Symbol", valid: /[^A-Za-z0-9]/.test(value) },
];

export const isStrongPassword = (value = "") =>
  getPasswordChecks(value).every((check) => check.valid);

interface PasswordFieldProps {
  id: string;
  label: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  validate?: (value: string) => true | string;
  valueForStrength?: string;
  showRequirements?: boolean;
}

export default function PasswordField({
  id,
  label,
  register,
  errors,
  disabled,
  required = true,
  autoComplete,
  validate,
  valueForStrength = "",
  showRequirements = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const checks = getPasswordChecks(valueForStrength);
  const score = checks.filter((check) => check.valid).length;
  const error = errors[id];

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={id}
          className={`mb-1.5 block text-xs font-medium ${error ? "text-error" : "text-muted"}`}
        >
          {label}
        </label>
        <div className="relative">
          <input
            id={id}
            type={visible ? "text" : "password"}
            disabled={disabled}
            autoComplete={autoComplete}
            aria-invalid={Boolean(error)}
            {...register(id, { required, validate })}
            className={`h-12 w-full rounded-sm border bg-white px-4 pr-12 text-base text-ink outline-none transition disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70 ${
              error
                ? "border-error focus:border-error focus:ring-1 focus:ring-error"
                : "border-hairline focus:border-ink focus:ring-1 focus:ring-ink"
            }`}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-surface-soft hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-1"
          >
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
      </div>

      {showRequirements && valueForStrength && (
        <div className="rounded-md border border-hairline-soft bg-surface-soft/70 p-4">
          <div className="mb-3 flex gap-1" aria-hidden="true">
            {checks.map((_, index) => (
              <span key={index} className={`h-1 flex-1 rounded-full transition-colors ${index < score ? "bg-ink" : "bg-hairline"}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {checks.map((check) => (
              <span key={check.label} className={`inline-flex items-center gap-1.5 text-xs ${check.valid ? "text-ink" : "text-muted"}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${check.valid ? "border-ink bg-ink text-white" : "border-hairline bg-white"}`}>
                  {check.valid && <Check size={10} strokeWidth={3} />}
                </span>
                {check.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {error?.message && <p className="text-xs text-error">{String(error.message)}</p>}
    </div>
  );
}
