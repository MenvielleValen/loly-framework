import pino from "pino";
import type { Logger as PinoLogger } from "pino";
import type { Request, Response } from "express";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export interface LoggerContext {
  [key: string]: unknown;
}

export interface LoggerOptions {
  level?: LogLevel;
  enabled?: boolean;
  pretty?: boolean;
  destination?: pino.DestinationStream;
}

/**
 * Creates a Pino logger instance with appropriate configuration for dev/prod.
 * 
 * - Development: Pretty printed with colors via pino-pretty
 * - Production: JSON structured output for log aggregation
 */
function createLogger(options: LoggerOptions = {}): PinoLogger {
  const {
    level = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "development" ? "debug" : "info"),
    enabled = process.env.LOG_ENABLED !== "false",
    pretty = process.env.NODE_ENV === "development",
    destination,
  } = options;

  if (!enabled) {
    // Return a no-op logger
    return pino({ enabled: false });
  }

  const baseConfig: pino.LoggerOptions = {
    level,
    base: {
      name: "@loly/core",
      env: process.env.NODE_ENV || "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  };

  // In development, use pino-pretty for colored, human-readable output
  if (pretty && !destination) {
    try {
      // Dynamic import to avoid bundling pino-pretty in production
      const pinoPretty = require("pino-pretty");
      return pino(
        baseConfig,
        pinoPretty({
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
          singleLine: false,
          messageFormat: "[{module}] {msg}",
        })
      );
    } catch (e) {
      // Fallback if pino-pretty is not available
      console.warn("[logger] pino-pretty not available, using default formatter");
    }
  }

  // Production: structured JSON logging
  return destination ? pino(baseConfig, destination) : pino(baseConfig);
}

// Singleton logger instance
let loggerInstance: PinoLogger | null = null;

/**
 * Gets or creates the singleton logger instance.
 */
export function getLogger(options?: LoggerOptions): PinoLogger {
  if (!loggerInstance) {
    loggerInstance = createLogger(options);
  }
  return loggerInstance;
}

/**
 * Sets a custom logger instance (useful for testing or custom configuration).
 */
export function setLogger(customLogger: PinoLogger): void {
  loggerInstance = customLogger;
}

/**
 * Resets the logger instance (useful for testing).
 */
export function resetLogger(): void {
  loggerInstance = null;
}

/**
 * Logger class wrapper for easier usage with context.
 */
export class Logger {
  private pino: PinoLogger;
  private context: LoggerContext;

  constructor(logger?: PinoLogger, context: LoggerContext = {}) {
    this.pino = logger || getLogger();
    this.context = context;
  }

  /**
   * Creates a child logger with additional context.
   */
  child(context: LoggerContext): Logger {
    return new Logger(this.pino.child(context), { ...this.context, ...context });
  }

  /**
   * Logs a fatal error (application should terminate).
   */
  fatal(message: string, context?: LoggerContext): void {
    this.pino.fatal({ ...this.context, ...context }, message);
  }

  /**
   * Logs an error.
   */
  error(message: string, error?: Error | unknown, context?: LoggerContext): void {
    const errorContext: LoggerContext = { ...this.context, ...context };
    
    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorContext.error = error;
    }

    this.pino.error(errorContext, message);
  }

  /**
   * Logs a warning.
   */
  warn(message: string, context?: LoggerContext): void {
    this.pino.warn({ ...this.context, ...context }, message);
  }

  /**
   * Logs informational message.
   */
  info(message: string, context?: LoggerContext): void {
    this.pino.info({ ...this.context, ...context }, message);
  }

  /**
   * Logs a debug message (only in development or when level is debug).
   */
  debug(message: string, context?: LoggerContext): void {
    this.pino.debug({ ...this.context, ...context }, message);
  }

  /**
   * Logs a trace message (most verbose).
   */
  trace(message: string, context?: LoggerContext): void {
    this.pino.trace({ ...this.context, ...context }, message);
  }
}

/**
 * Default logger instance.
 */
export const logger = new Logger();

/**
 * Creates a logger for a specific module/component.
 */
export function createModuleLogger(module: string, context?: LoggerContext): Logger {
  return logger.child({ module, ...context });
}

/**
 * Generates a unique request ID for request tracking.
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Default paths to ignore from request logging (static assets, favicon, etc.)
 */
const DEFAULT_IGNORED_PATHS = [
  /^\/static\//,           // Static assets
  /^\/favicon\.ico$/i,     // Favicon
  /^\/_next\//,            // Next.js internals (if used)
  /^\/\.well-known\//,     // Well-known paths
  /^\/__webpack/,          // Webpack dev server
  /^\/sockjs-node/,        // Hot reload websocket
];

/**
 * Checks if a path should be ignored from logging.
 */
function shouldIgnorePath(path: string, ignoredPaths: (string | RegExp)[]): boolean {
  return ignoredPaths.some(pattern => {
    if (typeof pattern === "string") {
      return path === pattern || path.startsWith(pattern);
    }
    return pattern.test(path);
  });
}

/**
 * Express middleware for request logging.
 * Adds request ID to res.locals and logs incoming requests.
 */
export function requestLoggerMiddleware(options: {
  logger?: Logger;
  logRequests?: boolean;
  logResponses?: boolean;
  ignorePaths?: (string | RegExp)[];
  logStaticAssets?: boolean;
} = {}) {
  const {
    logger: customLogger = logger,
    logRequests = true,
    logResponses = true,
    ignorePaths = DEFAULT_IGNORED_PATHS,
    logStaticAssets = false,
  } = options;

  return (req: Request, res: Response, next: () => void): void => {
    // Generate or use existing request ID
    const requestId = (req.headers["x-request-id"] as string) || generateRequestId();
    (res.locals as any).requestId = requestId;

    // Add request ID to response headers
    res.setHeader("X-Request-ID", requestId);

    // Check if we should ignore this path
    const shouldIgnore = !logStaticAssets && shouldIgnorePath(req.path, ignorePaths);

    // Create request-scoped logger (always available for handlers, minimal context to avoid duplication)
    const reqLogger = customLogger.child({
      requestId,
      method: req.method,
      path: req.path,
    });

    // Store logger in request for use in handlers (always available)
    (req as any).logger = reqLogger;

    // Log incoming request (only if not ignored and enabled)
    if (logRequests && !shouldIgnore) {
      reqLogger.debug(`${req.method} ${req.path}`, {
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
      });
    }

    // Log response when finished (only if not ignored)
    if (logResponses && !shouldIgnore) {
      const startTime = Date.now();
      
      res.on("finish", () => {
        const duration = Date.now() - startTime;
        // Only log errors and warnings by default, or successful requests if explicitly enabled
        const shouldLogSuccess = logRequests === true; // Only if logRequests is explicitly true
        
        if (res.statusCode >= 500) {
          reqLogger.error(`${req.method} ${req.path} ${res.statusCode}`, {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
          });
        } else if (res.statusCode >= 400) {
          reqLogger.warn(`${req.method} ${req.path} ${res.statusCode}`, {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
          });
        } else if (shouldLogSuccess) {
          // Only log successful requests if explicitly enabled
          reqLogger.debug(`${req.method} ${req.path} ${res.statusCode}`, {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
          });
        }
      });
    }

    next();
  };
}

/**
 * Gets the logger from the request object (set by requestLoggerMiddleware).
 */
export function getRequestLogger(req: Request): Logger {
  return (req as any).logger || logger.child({ requestId: "unknown" });
}

