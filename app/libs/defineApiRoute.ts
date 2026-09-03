import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { z } from "zod";

import { monitorApiRoute, getRequestLogger } from "@/app/libs/apiMonitoring";
import { getCurrentUserEnhanced, type AuthUser } from "@/app/libs/auth-middleware";
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";
import { captureException } from "@/app/libs/observability";
import type { Logger } from "@/app/libs/logger";

// Removes the repeated per-route preamble — monitoring wrapper, auth check,
// rate-limit rules, JSON body parse + zod validation — so a handler receives a
// ready-to-use context. Routes that don't need all of it still benefit from the
// consistent error shapes and the request-scoped logger.

type RateRule = { scope: string; identifier: string; limit: number; windowMs: number };

interface RouteContextBase {
  request: NextRequest;
  /** Dynamic-segment params, if this is a `[param]` route. */
  params: Record<string, string>;
  log: Logger;
}

interface AuthedContext<TBody> extends RouteContextBase {
  user: AuthUser;
  body: TBody;
}
interface AnonContext<TBody> extends RouteContextBase {
  user: AuthUser | null;
  body: TBody;
}

interface DefineRouteConfig<TBody, TAuth extends boolean> {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Require a signed-in user; a missing user returns 401 before the handler runs. */
  auth?: TAuth;
  /** Build rate-limit rules from the request + (maybe) the user. Runs after auth. */
  rateLimit?: (input: { request: NextRequest; user: AuthUser | null; ip: string }) => RateRule[];
  /** zod schema for the JSON body. A parse failure returns 400 with the issues. */
  body?: z.ZodType<TBody>;
}

function contextFrom(args: unknown[]): { request: NextRequest; params: Record<string, string> } {
  const request = args[0] as NextRequest;
  const maybeCtx = args[1] as { params?: unknown } | undefined;
  const params = maybeCtx?.params;
  // Next 15 route params can be a promise; the caller awaits it.
  return {
    request,
    params: (params && typeof params === "object" && !("then" in params)
      ? (params as Record<string, string>)
      : {}) as Record<string, string>,
  };
}

export function defineApiRoute<TBody = undefined, TAuth extends boolean = false>(
  config: DefineRouteConfig<TBody, TAuth>,
  handler: (
    ctx: TAuth extends true ? AuthedContext<TBody> : AnonContext<TBody>,
  ) => Response | Promise<Response>,
) {
  const wrapped = async (...args: unknown[]): Promise<Response> => {
    const { request } = contextFrom(args);
    const maybeCtx = args[1] as { params?: unknown } | undefined;
    const params = maybeCtx?.params
      ? ((await maybeCtx.params) as Record<string, string>)
      : {};
    const log = getRequestLogger(request, config.path);

    const user = await getCurrentUserEnhanced(request);
    if (config.auth && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (config.rateLimit) {
      const rules = config.rateLimit({ request, user, ip: getClientIp(request) });
      if (rules.length) {
        const result = await consumeRateLimits(rules);
        if (!result.allowed) return tooManyRequests(result.retryAfterSeconds);
      }
    }

    let body = undefined as TBody;
    if (config.body) {
      const raw = await request.json().catch(() => undefined);
      const parsed = config.body.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", issues: parsed.error.flatten() },
          { status: 400 },
        );
      }
      body = parsed.data;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await handler({ request, params, log, user, body } as any);
    } catch (error) {
      // This wrapper swallows the throw, so report it here (Next's
      // onRequestError won't see it).
      captureException(error, { event: "route_handler_threw", fields: { route: config.path } });
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };

  return monitorApiRoute(config.path, wrapped, config.method);
}
