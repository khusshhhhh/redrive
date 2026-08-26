type MemoryCacheOptions = {
  maxEntries: number;
  ttlMs: number;
};

type MemoryCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Small process-local TTL cache with an LRU-style eviction order.
 *
 * It is intentionally bounded: server memory is an optimisation, never an
 * unbounded data store. Callers must retain a durable/shared correctness path
 * because Vercel instances can restart or scale independently.
 */
export class BoundedMemoryCache<T> {
  private readonly entries = new Map<string, MemoryCacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(options: MemoryCacheOptions) {
    if (!Number.isSafeInteger(options.maxEntries) || options.maxEntries < 1) {
      throw new Error("Memory cache maxEntries must be a positive integer");
    }
    if (!Number.isSafeInteger(options.ttlMs) || options.ttlMs < 1) {
      throw new Error("Memory cache ttlMs must be a positive integer");
    }
    this.maxEntries = options.maxEntries;
    this.ttlMs = options.ttlMs;
  }

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }

    // Refresh insertion order on reads so frequently used entries survive
    // capacity eviction. The absolute expiry is deliberately unchanged.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.ttlMs, now = Date.now()) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 1) return;
    this.entries.delete(key);

    if (this.entries.size >= this.maxEntries) this.removeExpired(now);
    while (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }

    this.entries.set(key, { value, expiresAt: now + ttlMs });
  }

  delete(key: string) {
    return this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }

  private removeExpired(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}

