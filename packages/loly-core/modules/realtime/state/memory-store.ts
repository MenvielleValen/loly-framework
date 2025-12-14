import type { RealtimeStateStore } from "../types";

interface MemoryValue {
  value: any;
  expiresAt?: number;
}

interface LockEntry {
  expiresAt: number;
}

/**
 * In-memory state store implementation.
 * Suitable for single-instance deployments.
 * 
 * Features:
 * - Key-value storage with optional TTL
 * - Atomic increment/decrement
 * - List operations (push, range)
 * - Set operations (add, remove, members)
 * - Optional distributed locks
 */
export class MemoryStateStore implements RealtimeStateStore {
  private store: Map<string, MemoryValue> = new Map();
  private lists: Map<string, any[]> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private locks: Map<string, LockEntry> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();

    // Cleanup expired values
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key);
      }
    }

    // Cleanup expired locks
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt < now) {
        this.locks.delete(key);
      }
    }
  }

  /**
   * Get a value by key
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value with optional TTL
   */
  async set<T = any>(
    key: string,
    value: T,
    opts?: { ttlMs?: number }
  ): Promise<void> {
    const entry: MemoryValue = {
      value,
    };

    if (opts?.ttlMs) {
      entry.expiresAt = Date.now() + opts.ttlMs;
    }

    this.store.set(key, entry);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.lists.delete(key);
    this.sets.delete(key);
    this.locks.delete(key);
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, by: number = 1): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current ?? 0) + by;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * Decrement a numeric value
   */
  async decr(key: string, by: number = 1): Promise<number> {
    return this.incr(key, -by);
  }

  /**
   * Push to a list (left push)
   */
  async listPush(
    key: string,
    value: any,
    opts?: { maxLen?: number }
  ): Promise<void> {
    let list = this.lists.get(key);
    if (!list) {
      list = [];
      this.lists.set(key, list);
    }

    list.unshift(value);

    // Trim if maxLen specified
    if (opts?.maxLen && list.length > opts.maxLen) {
      list.splice(opts.maxLen);
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
    const list = this.lists.get(key);
    if (!list) {
      return [];
    }

    // Handle negative indices (from end)
    const len = list.length;
    const actualStart = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    const actualEnd = end < 0 ? Math.max(0, len + end + 1) : Math.min(end + 1, len);

    return list.slice(actualStart, actualEnd) as T[];
  }

  /**
   * Add member to a set
   */
  async setAdd(key: string, member: string): Promise<void> {
    let set = this.sets.get(key);
    if (!set) {
      set = new Set<string>();
      this.sets.set(key, set);
    }
    set.add(member);
  }

  /**
   * Remove member from a set
   */
  async setRem(key: string, member: string): Promise<void> {
    const set = this.sets.get(key);
    if (set) {
      set.delete(member);
      if (set.size === 0) {
        this.sets.delete(key);
      }
    }
  }

  /**
   * Get all members of a set
   */
  async setMembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    if (!set) {
      return [];
    }
    return Array.from(set);
  }

  /**
   * Acquire a distributed lock
   */
  async lock(key: string, ttlMs: number): Promise<() => Promise<void>> {
    const lockKey = `__lock:${key}`;
    const now = Date.now();
    const existingLock = this.locks.get(lockKey);

    // Check if lock exists and is still valid
    if (existingLock && existingLock.expiresAt > now) {
      throw new Error(`Lock '${key}' is already held`);
    }

    // Acquire lock
    this.locks.set(lockKey, {
      expiresAt: now + ttlMs,
    });

    // Return unlock function
    return async () => {
      const lock = this.locks.get(lockKey);
      if (lock && lock.expiresAt > Date.now()) {
        this.locks.delete(lockKey);
      }
    };
  }

  /**
   * Cleanup resources (call when shutting down)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.store.clear();
    this.lists.clear();
    this.sets.clear();
    this.locks.clear();
  }
}
