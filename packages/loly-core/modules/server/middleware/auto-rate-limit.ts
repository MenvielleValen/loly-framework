import { ApiRoute } from "@router/index.types";
import { strictRateLimiter, defaultRateLimiter, lenientRateLimiter } from "./rate-limit";

/**
 * Determines if a route path matches any of the strict patterns.
 * 
 * @param path - Route path to check
 * @param patterns - Array of patterns to match against
 * @returns True if path matches any pattern
 */
export function matchesStrictPattern(
  path: string,
  patterns: string[]
): boolean {
  for (const pattern of patterns) {
    // Convert pattern to regex
    // ** matches any path segment
    // * matches single path segment
    const regexPattern = pattern
      .replace(/\*\*/g, ".*") // ** -> .*
      .replace(/\*/g, "[^/]*") // * -> [^/]*
      .replace(/\//g, "\\/"); // / -> \/

    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(path)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a middleware is a rate limiter.
 * 
 * @param mw - Middleware to check
 * @returns True if middleware is a rate limiter
 */
function isRateLimiter(mw: any): boolean {
  if (!mw) return false;
  
  // Check if it's one of our known rate limiters
  if (mw === strictRateLimiter || mw === defaultRateLimiter || mw === lenientRateLimiter) {
    return true;
  }
  
  // Check for express-rate-limit signature
  // Rate limiters from express-rate-limit have specific properties
  if (typeof mw === 'function' && mw.name && mw.name.includes('rateLimit')) {
    return true;
  }
  
  // Check if middleware function has rate limit properties
  if (mw && typeof mw === 'function' && (mw as any).skip || (mw as any).resetKey) {
    return true;
  }
  
  return false;
}

/**
 * Gets the appropriate rate limiter for a route based on configuration.
 * 
 * @param route - API route
 * @param strictPatterns - Patterns that should use strict rate limiting
 * @returns Rate limiter middleware or null if route already has rate limiting
 */
export function getAutoRateLimiter(
  route: ApiRoute,
  strictPatterns: string[] = []
): any | null {
  // If route already has rate limiting middleware, don't add another
  const hasRateLimiter = route.middlewares?.some(isRateLimiter) ||
    Object.values(route.methodMiddlewares || {}).some((mws: any[]) => 
      mws?.some(isRateLimiter)
    );

  if (hasRateLimiter) {
    return null; // Route already has rate limiting
  }

  // Check if route matches strict patterns
  if (strictPatterns.length > 0 && matchesStrictPattern(route.pattern, strictPatterns)) {
    console.log(`[rate-limit] Applying strict rate limiter to route: ${route.pattern}`);
    return strictRateLimiter;
  }

  // Default: no auto rate limiting (global rate limiter already applied)
  return null;
}

