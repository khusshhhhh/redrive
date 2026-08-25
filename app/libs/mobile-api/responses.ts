import crypto from "crypto";
import { ZodError, type ZodType } from "zod";

const ids = new WeakMap<Request, string>();

export function mobileRequestId(request: Request) {
  const existing = ids.get(request);
  if (existing) return existing;

  const supplied = request.headers.get("x-request-id")?.trim();
  const requestId = supplied && /^[A-Za-z0-9._:-]{8,160}$/.test(supplied)
    ? supplied
    : `req_${crypto.randomUUID()}`;
  ids.set(request, requestId);
  return requestId;
}

function responseHeaders(request: Request, headers?: HeadersInit) {
  return {
    "Cache-Control": "private, no-store",
    "X-Request-Id": mobileRequestId(request),
    ...Object.fromEntries(new Headers(headers).entries()),
  };
}

export function mobileJson(
  request: Request,
  body: unknown,
  status = 200,
  headers?: HeadersInit,
) {
  return Response.json(body, { status, headers: responseHeaders(request, headers) });
}

export function mobileError(
  request: Request,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
  headers?: HeadersInit,
) {
  return mobileJson(request, {
    error: {
      code,
      message,
      requestId: mobileRequestId(request),
      ...(fields && Object.keys(fields).length ? { fields } : {}),
    },
  }, status, headers);
}

export async function parseMobileJson<T>(request: Request, schema: ZodType<T>) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64 * 1024) {
    return { ok: false as const, response: mobileError(request, 413, "REQUEST_TOO_LARGE", "The request is too large.") };
  }

  const body = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (parsed.success) return { ok: true as const, data: parsed.data };

  return {
    ok: false as const,
    response: mobileValidationError(request, parsed.error),
  };
}

export function mobileValidationError(request: Request, error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "request";
    fields[field] ??= issue.message;
  }
  return mobileError(request, 400, "VALIDATION_ERROR", "Check the highlighted information and try again.", fields);
}

export function mobileUnexpectedError(request: Request, error: unknown, logMessage: string) {
  console.error(logMessage, error);
  return mobileError(request, 500, "INTERNAL_ERROR", "Redrive could not complete that request.");
}
