import type { RealtimeStateStore } from "../types";

/**
 * Redis client type (supports both ioredis and redis packages)
 */
type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<string | "OK" | null>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  decr(key: string): Promise<number>;
  decrby(key: string, decrement: number): Promise<number>;
  lpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  eval(script: string, numKeys: number, ...keysAndArgs: string[]): Promise<any>;
  psetex(key: string, milliseconds: number, value: string): Promise<string | "OK">;
};

/**
 * Redis state store implementation.
 * Suitable for multi-instance/cluster deployments.
 * 
 * Features:
 * - Key-value storage with TTL
 * - Atomic increment/decrement
 * - List operations (push, range)
 * - Set operations (add, remove, members)
 * - Distributed locks using Redis SET NX EX
 */
export class RedisStateStore implements RealtimeStateStore {
  private client: RedisClient;
  private prefix: string;

  constructor(client: RedisClient, prefix: string = "loly:rt:") {
    this.client = client;
    this.prefix = prefix;
  }

  /**
   * Add prefix to key
   */
  private key(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Serialize value to JSON string
   */
  private serialize(value: any): string {
    return JSON.stringify(value);
  }

  /**
   * Deserialize JSON string to value
   */
  private deserialize<T>(value: string | null): T | null {
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Get a value by key
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(this.key(key));
    return this.deserialize<T>(value);
  }

  /**
   * Set a value with optional TTL
   */
  async set<T = any>(
    key: string,
    value: T,
    opts?: { ttlMs?: number }
  ): Promise<void> {
    const serialized = this.serialize(value);
    const prefixedKey = this.key(key);

    if (opts?.ttlMs) {
      // Use psetex for TTL
      await this.client.psetex(prefixedKey, opts.ttlMs, serialized);
    } else {
      await this.client.set(prefixedKey, serialized);
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, by: number = 1): Promise<number> {
    const prefixedKey = this.key(key);
    if (by === 1) {
      return await this.client.incr(prefixedKey);
    } else {
      return await this.client.incrby(prefixedKey, by);
    }
  }

  /**
   * Decrement a numeric value
   */
  async decr(key: string, by: number = 1): Promise<number> {
    const prefixedKey = this.key(key);
    if (by === 1) {
      return await this.client.decr(prefixedKey);
    } else {
      return await this.client.decrby(prefixedKey, by);
    }
  }

  /**
   * Push to a list (left push)
   */
  async listPush(
    key: string,
    value: any,
    opts?: { maxLen?: number }
  ): Promise<void> {
    const serialized = this.serialize(value);
    const prefixedKey = this.key(key);

    await this.client.lpush(prefixedKey, serialized);

    // Trim if maxLen specified (using LTRIM)
    if (opts?.maxLen) {
      // LTRIM key 0 maxLen-1 keeps first maxLen elements
      await this.client.eval(
        `redis.call('ltrim', KEYS[1], 0, ARGV[1])`,
        1,
        prefixedKey,
        String(opts.maxLen - 1)
      );
    }
  }

  /**
   * Get range from a list
   */
  async listRange<T = any>(
    key: string,
    start: number,
    end: number
  ): Promise<T[]> {
    const prefixedKey = this.key(key);
    const values = await this.client.lrange(prefixedKey, start, end);
    return values.map((v) => this.deserialize<T>(v)).filter((v) => v !== null) as T[];
  }

  /**
   * Add member to a set
   */
  async setAdd(key: string, member: string): Promise<void> {
    const prefixedKey = this.key(key);
    await this.client.sadd(prefixedKey, member);
  }

  /**
   * Remove member from a set
   */
  async setRem(key: string, member: string): Promise<void> {
    const prefixedKey = this.key(key);
    await this.client.srem(prefixedKey, member);
  }

  /**
   * Get all members of a set
   */
  async setMembers(key: string): Promise<string[]> {
    const prefixedKey = this.key(key);
    return await this.client.smembers(prefixedKey);
  }

  /**
   * Acquire a distributed lock using Redis SET NX EX
   */
  async lock(key: string, ttlMs: number): Promise<() => Promise<void>> {
    const lockKey = this.key(`__lock:${key}`);
    const lockValue = `${Date.now()}-${Math.random()}`;
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    // Try to acquire lock: SET lockKey lockValue NX EX ttlSeconds
    const result = await this.client.set(
      lockKey,
      lockValue,
      "NX", // Only set if not exists
      "EX", // Expire in seconds
      ttlSeconds
    );

    if (result === null) {
      throw new Error(`Lock '${key}' is already held`);
    }

    // Return unlock function
    return async () => {
      // Lua script to safely unlock (only if value matches)
      const unlockScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await this.client.eval(unlockScript, 1, lockKey, lockValue);
    };
  }
}
