import rateLimit from "express-rate-limit";
import { createModuleLogger } from "@logger/index";

const logger = createModuleLogger("rate-limit");

export interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  // Custom key generator (defaults to IP address)
  keyGenerator?: (req: any) => string;
  // Custom skip function
  skip?: (req: any) => boolean;
}

/**
 * Validates rate limit configuration.
 * 
 * @param config - Rate limiting configuration
 * @throws Error if configuration is invalid
 */
function validateRateLimitConfig(config: RateLimitConfig): void {
  if (config.windowMs !== undefined && (config.windowMs < 1000 || !Number.isInteger(config.windowMs))) {
    throw new Error(
      `Invalid rateLimit.windowMs: ${config.windowMs}. Must be an integer >= 1000 (milliseconds)`
    );
  }
  
  if (config.max !== undefined && (config.max < 1 || !Number.isInteger(config.max))) {
    throw new Error(
      `Invalid rateLimit.max: ${config.max}. Must be an integer >= 1`
    );
  }
}

/**
 * Creates a rate limiter middleware with configurable options.
 * 
 * @param config - Rate limiting configuration
 * @returns Express rate limit middleware
 * @throws Error if configuration is invalid
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  // Validate configuration
  validateRateLimitConfig(config);
  
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = "Too many requests from this IP, please try again later.",
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator,
    skip,
  } = config;

  const limiter = rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000), // seconds until retry
    },
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator,
    skip,
  });

  // Wrap limiter to add logging when rate limit is exceeded
  const wrappedLimiter = (req: any, res: any, next: any) => {
    limiter(req, res, (err?: any) => {
      if (err && res.statusCode === 429) {
        // Rate limit exceeded
        const ip = req.ip || req.connection?.remoteAddress || "unknown";
        logger.warn("Rate limit exceeded", {
          ip,
          path: req.path,
          method: req.method,
          limit: max,
          windowMs,
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }
      if (err) {
        return next(err);
      }
      next();
    });
  };

  // Copy properties from original limiter
  Object.setPrototypeOf(wrappedLimiter, limiter);
  Object.assign(wrappedLimiter, limiter);

  return wrappedLimiter as typeof limiter;
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

/**
 * Creates a rate limiter using values from ServerConfig.
 * Uses apiMax for API routes, or max for general routes.
 * 
 * @param config - ServerConfig rateLimit section
 * @param useApiMax - If true, use apiMax instead of max
 * @returns Rate limiter middleware or null if rate limiting is disabled
 */
export function createRateLimiterFromConfig(
  config: { windowMs?: number; max?: number; apiMax?: number; strictMax?: number } | undefined,
  useApiMax: boolean = false
) {
  if (!config) return null;
  
  const max = useApiMax ? (config.apiMax ?? config.max ?? 100) : (config.max ?? 100);
  const windowMs = config.windowMs ?? 15 * 60 * 1000;
  
  return createRateLimiter({
    windowMs,
    max,
    message: `Too many requests from this IP, please try again after ${Math.ceil(windowMs / 1000)} seconds.`,
  });
}

/**
 * Creates a strict rate limiter using strictMax from ServerConfig.
 * 
 * @param config - ServerConfig rateLimit section
 * @returns Rate limiter middleware or null if rate limiting is disabled
 */
export function createStrictRateLimiterFromConfig(
  config: { windowMs?: number; strictMax?: number } | undefined
) {
  if (!config || config.strictMax === undefined) {
    return strictRateLimiter; // Use default strict limiter
  }
  
  const windowMs = config.windowMs ?? 15 * 60 * 1000;
  
  return createRateLimiter({
    windowMs,
    max: config.strictMax,
    message: `Too many authentication attempts, please try again after ${Math.ceil(windowMs / 1000)} seconds.`,
  });
}

