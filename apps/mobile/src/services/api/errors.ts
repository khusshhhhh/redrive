import { mobileErrorSchema, type MobileErrorEnvelope } from "@redrive/contracts/mobile";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(status: number, payload: unknown, fallbackRequestId?: string) {
  const parsed = mobileErrorSchema.safeParse(payload);
  if (parsed.success) {
    const error: MobileErrorEnvelope["error"] = parsed.data.error;
    return new ApiError(status, error.code, error.message, error.requestId, error.fields);
  }
  return new ApiError(status, "REQUEST_FAILED", "Redrive could not complete that request.", fallbackRequestId);
}
