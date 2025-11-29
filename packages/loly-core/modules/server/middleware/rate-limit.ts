import rateLimit from "express-rate-limit";

export interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Creates a rate limiter middleware with configurable options.
 * 
 * @param config - Rate limiting configuration
 * @returns Express rate limit middleware
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = "Too many requests from this IP, please try again later.",
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
    },
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    skipFailedRequests,
  });
}

/**
 * Default rate limiter for general API routes.
 * Limits: 100 requests per 15 minutes per IP
 */
export const defaultRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

/**
 * Strict rate limiter for authentication and sensitive endpoints.
 * Limits: 5 requests per 15 minutes per IP
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many authentication attempts, please try again later.",
});

/**
 * Lenient rate limiter for public pages.
 * Limits: 200 requests per 15 minutes per IP
 */
export const lenientRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: "Too many requests from this IP, please try again later.",
});

