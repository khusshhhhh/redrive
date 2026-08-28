"use client";

import { useCallback, useMemo, useState } from "react";
import { runValidators, type Validator } from "@/app/libs/validators";

export interface FieldState {
  value: string;
  setValue: (next: string) => void;
  /** Mark the field as visited — call from the input's onBlur. */
  onBlur: () => void;
  /** The current error, regardless of whether it should be shown yet. */
  error: string | null;
  /** Show a red error message now? (visited and invalid) */
  showError: boolean;
  /** Show the green "looks good" tick now? (visited, non-empty, valid) */
  showValid: boolean;
  visited: boolean;
  /** Force validation to surface, e.g. on submit. Returns true when valid. */
  validate: () => boolean;
  reset: (value?: string) => void;
}

/**
 * One text field with the "validate on blur, then go live" behaviour:
 *  - nothing is flagged while the user is first typing
 *  - the moment focus leaves, an invalid value shows its error
 *  - after that the field re-checks on every keystroke, so the error clears
 *    as soon as it's fixed and a success tick takes its place
 */
export function useField(initialValue = "", validators: Validator[] = []): FieldState {
  const [value, setValueRaw] = useState(initialValue);
  const [visited, setVisited] = useState(false);
  const [forced, setForced] = useState(false);

  const error = useMemo(() => runValidators(value, validators), [value, validators]);
  const show = visited || forced;

  const setValue = useCallback((next: string) => setValueRaw(next), []);
  const onBlur = useCallback(() => setVisited(true), []);

  const validate = useCallback(() => {
    setForced(true);
    setVisited(true);
    return error === null;
  }, [error]);

  const reset = useCallback((next = initialValue) => {
    setValueRaw(next);
    setVisited(false);
    setForced(false);
  }, [initialValue]);

  return {
    value,
    setValue,
    onBlur,
    error,
    showError: show && error !== null,
    showValid: show && error === null && value.trim() !== "",
    visited,
    validate,
    reset,
  };
}

/** Validate a set of fields together (e.g. on submit). True when all pass. */
export function validateAll(...fields: Pick<FieldState, "validate">[]): boolean {
  // Call every field so they all surface their errors, then AND the results.
  return fields.map((field) => field.validate()).every(Boolean);
}
