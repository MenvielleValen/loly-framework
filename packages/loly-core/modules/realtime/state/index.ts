import type { RealtimeConfig } from "@server/config";
import type { RealtimeStateStore } from "../types";
import { MemoryStateStore } from "./memory-store";
import { RedisStateStore } from "./redis-store";

/**
 * Creates a state store instance based on configuration.
 * 
 * @param config - Realtime configuration
 * @returns State store instance
 */
export async function createStateStore(
  config: RealtimeConfig
): Promise<RealtimeStateStore> {
  if (!config.enabled) {
    // Return a no-op store if disabled
    return createNoOpStore();
  }

  const storeType = config.scale?.stateStore?.name || "memory";
  const prefix = config.scale?.stateStore?.prefix || "loly:rt:";

  if (storeType === "memory") {
    return new MemoryStateStore();
  }

  if (storeType === "redis") {
    const url = config.scale?.stateStore?.url || process.env.REDIS_URL;
    if (!url) {
      throw new Error(
        "[loly:realtime] Redis state store requires a URL. " +
        "Set realtime.scale.stateStore.url or REDIS_URL environment variable"
      );
    }

    const client = await createRedisClient(url);
    return new RedisStateStore(client, prefix);
  }

  throw new Error(
    `[loly:realtime] Unknown state store type: ${storeType}. ` +
    "Supported types: 'memory', 'redis'"
  );
}

/**
 * Creates a Redis client (supports both ioredis and redis packages).
 */
async function createRedisClient(url: string): Promise<any> {
  // Try ioredis first (more common)
  try {
    // @ts-ignore - Optional dependency may not be installed
    const Redis = await import("ioredis");
    return new Redis.default(url);
  } catch {
    // Fallback to redis package
    try {
      // @ts-ignore - Optional dependency may not be installed
      const { createClient } = await import("redis");
      const client = createClient({ url });
      await client.connect();
      return client;
    } catch (err) {
      throw new Error(
        "[loly:realtime] Failed to create Redis client. " +
        "Please install 'ioredis' or 'redis' package. " +
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

/**
 * Creates a no-op store (for when realtime is disabled).
 */
function createNoOpStore(): RealtimeStateStore {
  const noOp = async () => {
    // No-op
  };
  const noOpReturn = async () => null;
  const noOpNumber = async () => 0;
  const noOpArray = async () => [];
  const noOpUnlock = async () => {};

  return {
    get: noOpReturn,
    set: noOp,
    del: noOp,
    incr: noOpNumber,
    decr: noOpNumber,
    listPush: noOp,
    listRange: noOpArray,
    setAdd: noOp,
    setRem: noOp,
    setMembers: noOpArray,
    lock: async () => noOpUnlock,
  };
}

export { MemoryStateStore } from "./memory-store";
export { RedisStateStore } from "./redis-store";
