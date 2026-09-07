import axios from "axios";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

// Our API routes (defineApiRoute) answer an invalid body with
//   { error: "Invalid request", issues: { fieldErrors, formErrors } }
// where `issues` is a zod `flatten()`. This maps those field errors back onto
// the matching react-hook-form fields so the message lands under the input the
// user needs to fix, not only in a toast.
//
// Returns true when at least one field error was applied — the caller can then
// skip its generic "something went wrong" toast.
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  /** Restrict to fields the form actually has, so stray keys are ignored. */
  knownFields?: ReadonlyArray<Path<T>>,
): boolean {
  if (!axios.isAxiosError(error)) return false;

  const issues = error.response?.data?.issues as
    | { fieldErrors?: Record<string, string[] | undefined>; formErrors?: string[] }
    | undefined;
  const fieldErrors = issues?.fieldErrors;
  if (!fieldErrors) return false;

  let applied = false;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages?.[0];
    if (!message) continue;
    if (knownFields && !knownFields.includes(field as Path<T>)) continue;
    setError(field as Path<T>, { type: "server", message });
    applied = true;
  }
  return applied;
}
