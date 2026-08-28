"use client";

import { useId } from "react";
import { Check, TriangleAlert } from "lucide-react";
import type { FieldState } from "@/app/hooks/useField";

interface ValidatedInputProps {
  field: FieldState;
  label: string;
  hint?: string;
  /** Render a <textarea> instead of an <input>. */
  multiline?: boolean;
  rows?: number;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  name?: string;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  className?: string;
}

export default function ValidatedInput({
  field,
  label,
  hint,
  multiline = false,
  rows = 4,
  className = "",
  id,
  ...rest
}: ValidatedInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = field.showError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  const stateRing = field.showError
    ? "border-error focus:border-error focus:ring-error"
    : field.showValid
    ? "border-green-600 focus:border-green-600 focus:ring-green-600"
    : "border-hairline focus:border-ink focus:ring-ink";

  const base = `w-full rounded-sm border bg-white px-4 text-base text-ink outline-none transition placeholder:text-sm placeholder:text-muted-soft focus:ring-1 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70 ${stateRing} ${className}`;

  const shared = {
    id: inputId,
    value: field.value,
    onBlur: field.onBlur,
    "aria-invalid": field.showError || undefined,
    "aria-describedby": describedBy,
  };

  return (
    <div className="w-full">
      <label htmlFor={inputId} className={`mb-1.5 block text-xs font-medium ${field.showError ? "text-error" : "text-muted"}`}>
        {label}
      </label>

      <div className="relative">
        {multiline ? (
          <textarea
            {...shared}
            {...rest}
            rows={rows}
            onChange={(e) => field.setValue(e.target.value)}
            className={`${base} min-h-28 resize-y py-3`}
          />
        ) : (
          <input
            {...shared}
            {...rest}
            onChange={(e) => field.setValue(e.target.value)}
            className={`${base} h-12 pr-10`}
          />
        )}

        {!multiline && (field.showValid || field.showError) && (
          <span
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${field.showError ? "text-error" : "text-green-600"}`}
            aria-hidden="true"
          >
            {field.showError ? <TriangleAlert size={16} /> : <Check size={16} />}
          </span>
        )}
      </div>

      {field.showError ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-error">
          {field.error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
