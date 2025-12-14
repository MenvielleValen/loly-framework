import type { RealtimeStateStore, RateLimitCfg } from "../types";
import { TokenBucket } from "./token-bucket";

/**
 * Rate limiter using token bucket algorithm.
 * Supports both in-memory (single instance) and state store (cluster) modes.
 */
export class RateLimiter {
  private stateStore?: RealtimeStateStore;
  private memoryBuckets: Map<string, TokenBucket> = new Map();
  private prefix: string;

  constructor(stateStore?: RealtimeStateStore, prefix: string = "loly:rt:rate:") {
    this.stateStore = stateStore;
    this.prefix = prefix;
  }

  /**
   * Check if a request should be rate limited.
   * 
   * @param key - Unique key for the rate limit (e.g., socketId or socketId:eventName)
   * @param config - Rate limit configuration
   * @returns true if allowed, false if rate limited
   */
  async checkLimit(key: string, config: RateLimitCfg): Promise<boolean> {
    const fullKey = `${this.prefix}${key}`;
    const burst = config.burst || config.eventsPerSecond * 2;

    if (this.stateStore) {
      // Use state store for distributed rate limiting
      return this.checkLimitWithStore(fullKey, config.eventsPerSecond, burst);
    } else {
      // Use in-memory token bucket
      return this.checkLimitInMemory(fullKey, config.eventsPerSecond, burst);
    }
  }

  /**
   * Check rate limit using state store (for cluster mode)
   */
  private async checkLimitWithStore(
    key: string,
    ratePerSecond: number,
    burst: number
  ): Promise<boolean> {
    // Simple implementation: use a counter with TTL
    // In production, you might want a more sophisticated sliding window
    const count = await this.stateStore!.get<number>(key) || 0;
    
    if (count >= burst) {
      return false; // Rate limited
    }

    // Increment counter
    await this.stateStore!.incr(key, 1);
    
    // Set TTL to reset window (1 second)
    await this.stateStore!.set(key, count + 1, { ttlMs: 1000 });

    return true;
  }

  /**
   * Check rate limit using in-memory token bucket
   */
  private checkLimitInMemory(
    key: string,
    ratePerSecond: number,
    burst: number
  ): boolean {
    let bucket = this.memoryBuckets.get(key);
    
    if (!bucket) {
      bucket = new TokenBucket(burst, ratePerSecond);
      this.memoryBuckets.set(key, bucket);
    }

    return bucket.consume(1);
  }

  /**
   * Cleanup old buckets (call periodically)
   */
  cleanup(): void {
    // Remove buckets that haven't been used in a while
    // For now, we'll keep all buckets (they're lightweight)
    // In production, you might want to implement LRU eviction
  }
}
