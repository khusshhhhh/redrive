import axios from "axios";

/**
 * Pull a user-facing message out of an unknown thrown value. Our API routes
 * reply with `{ error: string }` (and sometimes `{ code }`), so an Axios error
 * carries the message on `response.data.error`; anything else falls back.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** The `code` field our API routes attach to some error responses, if present. */
export function apiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
