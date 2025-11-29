import type { ApiContext } from "@loly/core";

/**
 * Rate limit test endpoint.
 * 
 * This endpoint demonstrates automatic rate limiting.
 * The framework automatically applies strict rate limiting (5 requests per 15 minutes)
 * to routes matching patterns in loly.config.ts (like /api/test-rate-limit).
 * 
 * You can also manually add rate limiting if needed:
 * import { strictRateLimiter } from "@loly/core";
 * export const beforeApi: ApiMiddleware[] = [strictRateLimiter];
 */
export async function GET(ctx: ApiContext) {
  return ctx.Response({
    message: "Rate limit test endpoint - automatic strict rate limiting applied",
    timestamp: new Date().toISOString(),
    note: "This endpoint gets strict rate limiting automatically via loly.config.ts patterns",
  });
}

