/**
 * Small composable validators. Each returns an error string when invalid, or
 * `null` when the value passes. Use with `useField` / `<ValidatedInput>`.
 */
export type Validator = (value: string) => string | null;

export const required =
  (message = "This field is required"): Validator =>
  (value) =>
    value.trim().length > 0 ? null : message;

export const minLength =
  (n: number, message?: string): Validator =>
  (value) =>
    value.trim().length >= n ? null : message ?? `Must be at least ${n} characters`;

export const maxLength =
  (n: number, message?: string): Validator =>
  (value) =>
    value.trim().length <= n ? null : message ?? `Must be ${n} characters or fewer`;

export const maxWords =
  (n: number, message?: string): Validator =>
  (value) =>
    value.trim().split(/\s+/).filter(Boolean).length <= n ? null : message ?? `Keep it to ${n} words or fewer`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const email =
  (message = "Enter a valid email address"): Validator =>
  (value) =>
    value.trim() === "" || EMAIL_RE.test(value.trim()) ? null : message;

export const pattern =
  (re: RegExp, message: string): Validator =>
  (value) =>
    value.trim() === "" || re.test(value.trim()) ? null : message;

export const matches =
  (getOther: () => string, message = "Values do not match"): Validator =>
  (value) =>
    value === getOther() ? null : message;

/** Run validators in order and return the first error, or null. */
export function runValidators(value: string, validators: Validator[]): string | null {
  for (const validate of validators) {
    const error = validate(value);
    if (error) return error;
  }
  return null;
}
