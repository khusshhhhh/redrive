import "server-only";

import prisma from "@/app/libs/prismadb";

type MonitoringOptions = {
  environment: string;
  hours: number;
};

type Bucket = Awaited<ReturnType<typeof loadBuckets>>[number];

const loadBuckets = (environment: string, since: Date) => prisma.apiMetricBucket.findMany({
  where: { environment, windowStart: { gte: since } },
  orderBy: { windowStart: "asc" },
});

function sum(buckets: Bucket[], field: keyof Bucket) {
  return buckets.reduce((total, bucket) => total + Number(bucket[field] || 0), 0);
}

function latencyBand(buckets: Bucket[]) {
  const bands = [
    { label: "under 100 ms", value: sum(buckets, "durationLt100") },
    { label: "100–500 ms", value: sum(buckets, "durationLt500") },
    { label: "500 ms–1 s", value: sum(buckets, "durationLt1000") },
    { label: "1–3 s", value: sum(buckets, "durationLt3000") },
    { label: "3 s or slower", value: sum(buckets, "durationGte3000") },
  ];
  const total = bands.reduce((value, band) => value + band.value, 0);
  let cursor = 0;
  const p95 = bands.find((band) => {
    cursor += band.value;
    return total > 0 && cursor / total >= 0.95;
  })?.label || "No samples";
  return { bands, p95 };
}

function aggregateRoutes(buckets: Bucket[]) {
  const routes = new Map<string, {
    route: string;
    method: string;
    requests: number;
    samples: number;
    successes: number;
    clientErrors: number;
    serverErrors: number;
    rateLimited: number;
    unauthorised: number;
    duration: number;
    cpu: number;
    memory: number;
    bytes: number;
    coldStarts: number;
    lastSeenAt: Date;
    lastStatus: number | null;
  }>();

  for (const bucket of buckets) {
    const key = `${bucket.method}|${bucket.route}`;
    const row = routes.get(key) || {
      route: bucket.route,
      method: bucket.method,
      requests: 0,
      samples: 0,
      successes: 0,
      clientErrors: 0,
      serverErrors: 0,
      rateLimited: 0,
      unauthorised: 0,
      duration: 0,
      cpu: 0,
      memory: 0,
      bytes: 0,
      coldStarts: 0,
      lastSeenAt: bucket.lastSeenAt,
      lastStatus: bucket.lastStatus,
    };
    row.requests += bucket.requestCount;
    row.samples += bucket.sampleCount;
    row.successes += bucket.successCount;
    row.clientErrors += bucket.clientErrorCount;
    row.serverErrors += bucket.serverErrorCount;
    row.rateLimited += bucket.rateLimitedCount;
    row.unauthorised += bucket.unauthorisedCount;
    row.duration += bucket.totalDurationMs;
    row.cpu += bucket.totalCpuMs;
    row.memory += bucket.totalMemoryMb;
    row.bytes += bucket.totalRequestBytes;
    row.coldStarts += bucket.coldStartCount;
    if (bucket.lastSeenAt > row.lastSeenAt) {
      row.lastSeenAt = bucket.lastSeenAt;
      row.lastStatus = bucket.lastStatus;
    }
    routes.set(key, row);
  }

  return Array.from(routes.values()).map((row) => ({
    ...row,
    averageDurationMs: row.requests ? row.duration / row.requests : 0,
    averageCpuMs: row.requests ? row.cpu / row.requests : 0,
    averageMemoryMb: row.requests ? row.memory / row.requests : 0,
    averageRequestKb: row.requests ? row.bytes / row.requests / 1024 : 0,
    errorRate: row.requests ? ((row.clientErrors + row.serverErrors) / row.requests) * 100 : 0,
  })).sort((a, b) => b.requests - a.requests);
}

function aggregateTimeline(buckets: Bucket[], since: Date, hours: number) {
  const useDays = hours > 48;
  const points = new Map<string, { key: string; label: string; requests: number; errors: number; duration: number }>();
  const count = useDays ? Math.ceil(hours / 24) : hours;

  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(since);
    if (useDays) date.setUTCDate(date.getUTCDate() + offset);
    else date.setUTCHours(date.getUTCHours() + offset);
    const key = useDays ? date.toISOString().slice(0, 10) : date.toISOString().slice(0, 13);
    points.set(key, {
      key,
      label: useDays
        ? date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
        : date.toLocaleTimeString("en-AU", { hour: "numeric" }),
      requests: 0,
      errors: 0,
      duration: 0,
    });
  }

  for (const bucket of buckets) {
    const key = useDays ? bucket.windowStart.toISOString().slice(0, 10) : bucket.windowStart.toISOString().slice(0, 13);
    const point = points.get(key);
    if (!point) continue;
    point.requests += bucket.requestCount;
    point.errors += bucket.clientErrorCount + bucket.serverErrorCount;
    point.duration += bucket.totalDurationMs;
  }
  return Array.from(points.values());
}

export async function getApiMonitoringData({ environment, hours }: MonitoringOptions) {
  const now = new Date();
  const since = new Date(now.getTime() - hours * 3_600_000);
  since.setUTCMinutes(0, 0, 0);
  const lastDay = new Date(now.getTime() - 24 * 3_600_000);

  const [buckets, environments, recentErrors, activeRateLimits, auditEvents, activeSessions, webhookEvents] = await Promise.all([
    loadBuckets(environment, since),
    prisma.apiMetricBucket.findMany({ distinct: ["environment"], select: { environment: true }, orderBy: { environment: "asc" } }),
    prisma.apiErrorEvent.findMany({ where: { environment, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.rateLimitBucket.count({ where: { expiresAt: { gt: now } } }),
    prisma.auditEvent.count({ where: { createdAt: { gte: lastDay } } }),
    prisma.userSession.count({ where: { expiresAt: { gt: now }, revokedAt: null } }),
    prisma.stripeWebhookEvent.count({ where: { processedAt: { gte: lastDay } } }),
  ]);

  const requests = sum(buckets, "requestCount");
  const samples = sum(buckets, "sampleCount");
  const successes = sum(buckets, "successCount");
  const redirects = sum(buckets, "redirectCount");
  const clientErrors = sum(buckets, "clientErrorCount");
  const serverErrors = sum(buckets, "serverErrorCount");
  const rateLimited = sum(buckets, "rateLimitedCount");
  const unauthorised = sum(buckets, "unauthorisedCount");
  const duration = sum(buckets, "totalDurationMs");
  const cpu = sum(buckets, "totalCpuMs");
  const memory = sum(buckets, "totalMemoryMb");
  const requestBytes = sum(buckets, "totalRequestBytes");
  const coldStarts = sum(buckets, "coldStartCount");
  const routes = aggregateRoutes(buckets);
  const latency = latencyBand(buckets);
  const regionMap = new Map<string, number>();
  buckets.forEach((bucket) => regionMap.set(bucket.region || "unknown", (regionMap.get(bucket.region || "unknown") || 0) + bucket.requestCount));

  return {
    generatedAt: now.toISOString(),
    environment,
    hours,
    environments: Array.from(new Set(["production", "preview", "development", ...environments.map((item) => item.environment)])),
    metrics: {
      requests,
      samples,
      successes,
      redirects,
      clientErrors,
      serverErrors,
      rateLimited,
      unauthorised,
      coldStarts,
      averageDurationMs: requests ? duration / requests : 0,
      averageCpuMs: requests ? cpu / requests : 0,
      averageMemoryMb: requests ? memory / requests : 0,
      averageRequestKb: requests ? requestBytes / requests / 1024 : 0,
      errorRate: requests ? ((clientErrors + serverErrors) / requests) * 100 : 0,
      serverErrorRate: requests ? (serverErrors / requests) * 100 : 0,
      monitoredRoutes: routes.length,
      p95Band: latency.p95,
    },
    operational: { activeRateLimits, auditEvents, activeSessions, webhookEvents },
    routes,
    timeline: aggregateTimeline(buckets, since, hours),
    latencyBands: latency.bands,
    regions: Array.from(regionMap, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    recentErrors,
  };
}

export type ApiMonitoringData = Awaited<ReturnType<typeof getApiMonitoringData>>;
