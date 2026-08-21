import crypto from "crypto";
import { after } from "next/server";
import type { NextApiHandler } from "next";

import prisma from "@/app/libs/prismadb";

type MetricInput = {
  route: string;
  method: string;
  status: number;
  durationMs: number;
  cpuMs: number;
  memoryMb: number;
  requestBytes: number;
  errorName?: string;
  requestId?: string;
  coldStart: boolean;
};

const MONITOR_RETENTION_DAYS = 90;
const ERROR_RETENTION_DAYS = 30;
let firstRequestInInstance = true;

function environmentName() {
  // `next start` sets NODE_ENV=production locally; only classify traffic as
  // production when it is actually running inside a Vercel environment.
  return process.env.VERCEL_ENV || (process.env.VERCEL ? "production" : "development");
}

function regionName() {
  return process.env.VERCEL_REGION || process.env.AWS_REGION || null;
}

function samplingWeight(status: number, environment: string) {
  if (environment !== "production") return 1;
  if (status >= 500) return 1;

  const configured = status >= 400
    ? Number(process.env.API_MONITOR_CLIENT_ERROR_SAMPLE_RATE || 0.5)
    : Number(process.env.API_MONITOR_SUCCESS_SAMPLE_RATE || 0.25);
  const rate = Number.isFinite(configured) ? Math.min(1, Math.max(0.01, configured)) : 0.25;
  return Math.max(1, Math.round(1 / rate));
}

function shouldRecord(weight: number) {
  return weight === 1 || Math.random() < (1 / weight);
}

function hourStart(date: Date) {
  const value = new Date(date);
  value.setUTCMinutes(0, 0, 0);
  return value;
}

async function recordMetric(input: MetricInput) {
  const environment = environmentName();
  const weight = samplingWeight(input.status, environment);
  if (!shouldRecord(weight)) return;

  const now = new Date();
  const windowStart = hourStart(now);
  const region = regionName();
  const key = `${environment}|${region || "unknown"}|${input.method}|${input.route}|${windowStart.toISOString()}`;
  const id = crypto.createHash("sha256").update(key).digest("hex").slice(0, 24);
  const expiresAt = new Date(windowStart.getTime() + MONITOR_RETENTION_DAYS * 86_400_000);
  const durationField = input.durationMs < 100
    ? "durationLt100"
    : input.durationMs < 500
      ? "durationLt500"
      : input.durationMs < 1000
        ? "durationLt1000"
        : input.durationMs < 3000
          ? "durationLt3000"
          : "durationGte3000";

  const increments = {
    requestCount: weight,
    sampleCount: 1,
    successCount: input.status >= 200 && input.status < 300 ? weight : 0,
    redirectCount: input.status >= 300 && input.status < 400 ? weight : 0,
    clientErrorCount: input.status >= 400 && input.status < 500 ? weight : 0,
    serverErrorCount: input.status >= 500 ? weight : 0,
    rateLimitedCount: input.status === 429 ? weight : 0,
    unauthorisedCount: input.status === 401 || input.status === 403 ? weight : 0,
    totalDurationMs: input.durationMs * weight,
    totalCpuMs: input.cpuMs * weight,
    totalMemoryMb: input.memoryMb * weight,
    totalRequestBytes: input.requestBytes * weight,
    durationLt100: durationField === "durationLt100" ? weight : 0,
    durationLt500: durationField === "durationLt500" ? weight : 0,
    durationLt1000: durationField === "durationLt1000" ? weight : 0,
    durationLt3000: durationField === "durationLt3000" ? weight : 0,
    durationGte3000: durationField === "durationGte3000" ? weight : 0,
    coldStartCount: input.coldStart ? 1 : 0,
  };

  await prisma.apiMetricBucket.upsert({
    where: { id },
    create: {
      id,
      key,
      environment,
      route: input.route,
      method: input.method,
      region,
      windowStart,
      expiresAt,
      lastStatus: input.status,
      ...increments,
    },
    update: {
      requestCount: { increment: increments.requestCount },
      sampleCount: { increment: increments.sampleCount },
      successCount: { increment: increments.successCount },
      redirectCount: { increment: increments.redirectCount },
      clientErrorCount: { increment: increments.clientErrorCount },
      serverErrorCount: { increment: increments.serverErrorCount },
      rateLimitedCount: { increment: increments.rateLimitedCount },
      unauthorisedCount: { increment: increments.unauthorisedCount },
      totalDurationMs: { increment: increments.totalDurationMs },
      totalCpuMs: { increment: increments.totalCpuMs },
      totalMemoryMb: { increment: increments.totalMemoryMb },
      totalRequestBytes: { increment: increments.totalRequestBytes },
      durationLt100: { increment: increments.durationLt100 },
      durationLt500: { increment: increments.durationLt500 },
      durationLt1000: { increment: increments.durationLt1000 },
      durationLt3000: { increment: increments.durationLt3000 },
      durationGte3000: { increment: increments.durationGte3000 },
      coldStartCount: { increment: increments.coldStartCount },
      lastStatus: input.status,
      expiresAt,
    },
  });

  if (input.status >= 500) {
    await prisma.apiErrorEvent.create({
      data: {
        environment,
        route: input.route,
        method: input.method,
        region,
        status: input.status,
        durationMs: input.durationMs,
        errorName: input.errorName?.slice(0, 120) || null,
        requestId: input.requestId?.slice(0, 160) || null,
        expiresAt: new Date(now.getTime() + ERROR_RETENTION_DAYS * 86_400_000),
      },
    });
  }
}

/**
 * Adds low-overhead, payload-free telemetry to an App Router API handler.
 * Successful production requests are sampled; server failures are complete.
 */
export function monitorApiRoute<TArgs extends unknown[]>(
  route: string,
  handler: (...args: TArgs) => Response | Promise<Response>,
  explicitMethod?: string,
) {
  return async (...args: TArgs): Promise<Response> => {
    const request = args[0] instanceof Request ? args[0] : undefined;
    const method = request?.method || explicitMethod || "UNKNOWN";
    const startedAt = performance.now();
    const cpuStartedAt = process.cpuUsage();
    const coldStart = firstRequestInInstance;
    firstRequestInInstance = false;
    let status = 500;
    let errorName: string | undefined;

    try {
      const response = await handler(...args);
      status = response.status;
      return response;
    } catch (error) {
      errorName = error instanceof Error ? error.name : "UnknownError";
      throw error;
    } finally {
      const durationMs = performance.now() - startedAt;
      const cpu = process.cpuUsage(cpuStartedAt);
      const metric: MetricInput = {
        route,
        method,
        status,
        durationMs,
        cpuMs: (cpu.user + cpu.system) / 1000,
        memoryMb: process.memoryUsage().rss / 1024 / 1024,
        requestBytes: Math.max(0, Number(request?.headers.get("content-length") || 0) || 0),
        errorName,
        requestId: request?.headers.get("x-vercel-id") || undefined,
        coldStart,
      };

      if (status >= 500) {
        console.error(JSON.stringify({
          event: "api_request_failed",
          route,
          method,
          status,
          durationMs: Math.round(durationMs),
          requestId: metric.requestId,
          errorName,
        }));
      }

      try {
        after(async () => {
          await recordMetric(metric).catch((error) => console.error("API monitoring write failed", error));
        });
      } catch {
        // Keeps direct handler tests usable outside a Next request context.
        void recordMetric(metric).catch((error) => console.error("API monitoring write failed", error));
      }
    }
  };
}

/** Pages Router companion used by the existing NextAuth catch-all endpoint. */
export function monitorPagesApiRoute(route: string, handler: NextApiHandler): NextApiHandler {
  return async (request, response) => {
    const startedAt = performance.now();
    const cpuStartedAt = process.cpuUsage();
    const coldStart = firstRequestInInstance;
    firstRequestInInstance = false;
    let errorName: string | undefined;

    try {
      await handler(request, response);
    } catch (error) {
      errorName = error instanceof Error ? error.name : "UnknownError";
      if (response.statusCode < 500) response.statusCode = 500;
      throw error;
    } finally {
      const cpu = process.cpuUsage(cpuStartedAt);
      await recordMetric({
        route,
        method: request.method || "UNKNOWN",
        status: response.statusCode || 200,
        durationMs: performance.now() - startedAt,
        cpuMs: (cpu.user + cpu.system) / 1000,
        memoryMb: process.memoryUsage().rss / 1024 / 1024,
        requestBytes: Math.max(0, Number(request.headers["content-length"] || 0) || 0),
        errorName,
        requestId: typeof request.headers["x-vercel-id"] === "string" ? request.headers["x-vercel-id"] : undefined,
        coldStart,
      }).catch((error) => console.error("API monitoring write failed", error));
    }
  };
}
