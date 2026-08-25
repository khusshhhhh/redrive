import { createClient } from "redis";

function createRedisClient() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is required when REDIS_ENABLED=true");
  }

  const client = createClient({
    url,
    disableOfflineQueue: true,
    commandsQueueMaxLength: 1_000,
    socket: {
      connectTimeout: 1_500,
      reconnectStrategy: (retries) => {
        if (retries >= 3) return false;
        return Math.min(100 * 2 ** retries, 1_000) + Math.floor(Math.random() * 100);
      },
    },
  });

  client.on("error", (error) => {
    const message = error instanceof Error ? error.message : "Unknown Redis error";
    console.error("Redis client error:", message);
  });

  return client;
}

type RedriveRedisClient = ReturnType<typeof createRedisClient>;

declare global {
  // Reuse the connection across Next.js hot reloads in local development.
  // eslint-disable-next-line no-var
  var redriveRedisClient: RedriveRedisClient | undefined;
}

let redisClient = globalThis.redriveRedisClient;
let connectPromise: Promise<RedriveRedisClient> | undefined;

export function redisEnabled() {
  return process.env.REDIS_ENABLED?.trim().toLowerCase() === "true";
}

export function redisKeyPrefix() {
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  const prefix = (process.env.REDIS_KEY_PREFIX?.trim() || `redrive:${environment}`).replace(/:+$/, "");

  if (!/^[A-Za-z0-9:_-]{1,100}$/.test(prefix)) {
    throw new Error("REDIS_KEY_PREFIX may contain only letters, numbers, colons, underscores, and hyphens");
  }

  return prefix;
}

export async function getRedis(): Promise<RedriveRedisClient> {
  let client = redisClient;
  if (!client) {
    client = createRedisClient();
    redisClient = client;
    if (process.env.NODE_ENV === "development") globalThis.redriveRedisClient = client;
  }

  if (client.isReady || client.isOpen) return client;

  connectPromise ??= client.connect().then(() => client);
  try {
    return await connectPromise;
  } catch (error) {
    if (redisClient === client) redisClient = undefined;
    if (globalThis.redriveRedisClient === client) globalThis.redriveRedisClient = undefined;
    try {
      client.destroy();
    } catch {
      // The socket may already have been destroyed by the client.
    }
    throw error;
  } finally {
    connectPromise = undefined;
  }
}
