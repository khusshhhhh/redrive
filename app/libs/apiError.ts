import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { captureException } from "@/app/libs/observability";

/**
 * Central handler for an unexpected error in an API route.
 *
 * Logs the real error server-side (with a short reference id and the error
 * tracker), and returns a generic 500 body carrying only that reference id —
 * never the exception message, stack, or type. Support can look the reference
 * up; an attacker learns nothing.
 *
 *   } catch (error) {
 *     return internalError(error, { event: "listing_update_failed", route: "PATCH /api/listings/[id]" });
 *   }
 */
export function internalError(
  error: unknown,
  context: {
    event: string;
    route?: string;
    fields?: Record<string, unknown>;
    status?: number;
    message?: string;
  },
): NextResponse {
  const reference = randomUUID().slice(0, 8);
  captureException(error, {
    event: context.event,
    fields: { ...context.fields, reference, route: context.route },
  });
  return NextResponse.json(
    {
      error: context.message || "Something went wrong. Please try again.",
      reference,
    },
    { status: context.status ?? 500, headers: { "Cache-Control": "no-store" } },
  );
}
