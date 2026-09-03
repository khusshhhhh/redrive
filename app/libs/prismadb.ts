import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Bound the per-instance MongoDB pool. On Vercel every concurrent function
 * instance opens its own pool, so an unbounded default can exhaust the Atlas
 * connection cap under a spike. `maxIdleTimeMS` also lets a frozen Lambda's
 * idle sockets be reaped. Override with DATABASE_POOL_SIZE.
 */
function pooledUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("maxPoolSize")) {
      parsed.searchParams.set("maxPoolSize", process.env.DATABASE_POOL_SIZE || "5");
    }
    if (!parsed.searchParams.has("maxIdleTimeMS")) {
      parsed.searchParams.set("maxIdleTimeMS", "60000");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const url = pooledUrl();
const client =
  globalThis.prisma ||
  new PrismaClient(url ? { datasourceUrl: url } : undefined);

// Cache the client on the global in every environment: in development it must
// survive HMR reloads (each would otherwise leak a client + its pool); in
// production the module is evaluated once so this is a no-op.
globalThis.prisma = client;

export default client;
