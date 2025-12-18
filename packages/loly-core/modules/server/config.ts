import { getServerFile } from "./utils/server-dir";

export const CONFIG_FILE_NAME = "loly.config";

/**
 * Realtime/WebSocket configuration
 */
export interface RealtimeConfig {
  /** Enable realtime features */
  enabled?: boolean;

  /** Socket.IO server settings */
  path?: string;
  transports?: ("websocket" | "polling")[];
  pingIntervalMs?: number;
  pingTimeoutMs?: number;
  maxPayloadBytes?: number;

  /** Security */
  allowedOrigins?: string | string[];
  cors?: {
    credentials?: boolean;
    allowedHeaders?: string[];
  };

  /** Scaling configuration */
  scale?: {
    mode?: "single" | "cluster";
    adapter?: {
      name: "redis";
      url: string;
      pubClientName?: string;
      subClientName?: string;
    };
    stateStore?: {
      name: "memory" | "redis";
      url?: string;
      prefix?: string;
    };
  };

  /** Rate limiting */
  limits?: {
    connectionsPerIp?: number;
    eventsPerSecond?: number;
    burst?: number;
  };

  /** Logging */
  logging?: {
    level?: "debug" | "info" | "warn" | "error";
    pretty?: boolean;
  };
}

export interface ServerConfig {
    bodyLimit?: string;
    corsOrigin?: string | string[] | boolean | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
    rateLimit?: {
        windowMs?: number;
        max?: number;
        apiMax?: number;
        strictMax?: number;
        // Auto-apply strict rate limiting to routes matching these patterns
        strictPatterns?: string[];
    };
    security?: {
        contentSecurityPolicy?: boolean | Record<string, any>;
        hsts?: boolean | { maxAge?: number; includeSubDomains?: boolean };
    };
    /** Realtime/WebSocket configuration */
    realtime?: RealtimeConfig;
}

const DEFAULT_REALTIME_CONFIG: RealtimeConfig = {
    enabled: true,
    path: "/wss",
    transports: ["websocket", "polling"],
    pingIntervalMs: 25000,
    pingTimeoutMs: 20000,
    maxPayloadBytes: 64 * 1024,
    allowedOrigins: process.env.NODE_ENV === "production" ? [] : "*",
    cors: {
        credentials: true,
        allowedHeaders: ["content-type", "authorization"],
    },
    scale: {
        mode: "single",
    },
    limits: {
        connectionsPerIp: 20,
        eventsPerSecond: 30,
        burst: 60,
    },
    logging: {
        level: process.env.NODE_ENV === "production" ? "warn" : "info",
        pretty: process.env.NODE_ENV !== "production",
    },
};

const DEFAULT_CONFIG: ServerConfig = {
    bodyLimit: '1mb',
    corsOrigin: process.env.CORS_ORIGIN 
        ? (process.env.CORS_ORIGIN.includes(',') 
            ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
            : process.env.CORS_ORIGIN)
        : (process.env.NODE_ENV === 'production' ? [] : true),
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // General requests
        apiMax: 100, // API requests
        strictMax: 5, // Strict endpoints (auth, etc.)
        // Auto-apply strict rate limiting to these route patterns
        strictPatterns: [
            '/api/auth/**',
            '/api/login/**',
            '/api/register/**',
            '/api/password/**',
            '/api/reset/**',
            '/api/verify/**',
        ],
    },
    security: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for dev
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
        },
    },
    realtime: DEFAULT_REALTIME_CONFIG,
}

export async function getServerConfig(
  projectRoot: string,
): Promise<ServerConfig> {
  let mod: any = await getServerFile(projectRoot, CONFIG_FILE_NAME);

  if (typeof mod?.config === "function") {
    const options = mod?.config(process.env.NODE_ENV) as ServerConfig;

    // Deep merge for nested objects
    const merged: ServerConfig = {
      ...DEFAULT_CONFIG,
      ...options,
      rateLimit: {
        ...DEFAULT_CONFIG.rateLimit,
        ...options.rateLimit,
      },
      security: {
        ...DEFAULT_CONFIG.security,
        ...options.security,
      },
      realtime: {
        ...DEFAULT_REALTIME_CONFIG,
        ...options.realtime,
        cors: {
          ...DEFAULT_REALTIME_CONFIG.cors,
          ...options.realtime?.cors,
        },
        scale: options.realtime?.scale
          ? {
              ...DEFAULT_REALTIME_CONFIG.scale,
              ...options.realtime.scale,
              adapter: options.realtime.scale.adapter,
              stateStore: options.realtime.scale.stateStore
                ? {
                    ...DEFAULT_REALTIME_CONFIG.scale?.stateStore,
                    ...options.realtime.scale.stateStore,
                    // Ensure name is set (user config takes priority, fallback to default or "memory")
                    name: (options.realtime.scale.stateStore.name || 
                           DEFAULT_REALTIME_CONFIG.scale?.stateStore?.name || 
                           "memory") as "memory" | "redis",
                  }
                : DEFAULT_REALTIME_CONFIG.scale?.stateStore,
            }
          : DEFAULT_REALTIME_CONFIG.scale,
        limits: {
          ...DEFAULT_REALTIME_CONFIG.limits,
          ...options.realtime?.limits,
        },
        logging: {
          ...DEFAULT_REALTIME_CONFIG.logging,
          ...options.realtime?.logging,
        },
      },
    };

    // Validate realtime config
    validateRealtimeConfig(merged.realtime!);

    return merged;
  }

  // Validate default config
  validateRealtimeConfig(DEFAULT_CONFIG.realtime!);

  return DEFAULT_CONFIG;
}

/**
 * Validates realtime configuration and throws errors for invalid setups.
 */
function validateRealtimeConfig(config: RealtimeConfig): void {
  if (!config.enabled) {
    return; // Skip validation if disabled
  }

  // Cluster mode requires adapter
  if (config.scale?.mode === "cluster") {
    if (!config.scale.adapter) {
      throw new Error(
        "[loly:realtime] Cluster mode requires a Redis adapter. " +
        "Please configure realtime.scale.adapter in your loly.config.ts"
      );
    }

    if (config.scale.adapter.name !== "redis") {
      throw new Error(
        "[loly:realtime] Only Redis adapter is supported for cluster mode"
      );
    }

    if (!config.scale.adapter.url) {
      throw new Error(
        "[loly:realtime] Redis adapter requires a URL. " +
        "Set realtime.scale.adapter.url or REDIS_URL environment variable"
      );
    }

    // Warning if stateStore is memory in cluster mode
    if (config.scale.stateStore?.name === "memory") {
      console.warn(
        "[loly:realtime] WARNING: Using memory state store in cluster mode. " +
        "State will diverge across instances. Consider using Redis state store."
      );
    }
  }

  // Production requires allowedOrigins (but auto-allow localhost for simplicity)
  if (process.env.NODE_ENV === "production") {
    // If no config or "*", auto-allow localhost (for local development)
    // The wss.ts will handle converting "*" to localhost-allowing function
    if (!config.allowedOrigins || 
        (Array.isArray(config.allowedOrigins) && config.allowedOrigins.length === 0) ||
        config.allowedOrigins === "*") {
      // Keep "*" - wss.ts will auto-convert to localhost-allowing function
      // This allows local development without configuration
      config.allowedOrigins = "*";
      console.warn(
        "[loly:realtime] No allowedOrigins configured. " +
        "Auto-allowing localhost for local development. " +
        "For production deployment, configure realtime.allowedOrigins in loly.config.ts"
      );
    }
    // If user explicitly set "*", allow it (wss.ts will handle it)
  }
}
