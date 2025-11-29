import { getServerFile } from "./utils/server-dir";

export const CONFIG_FILE_NAME = "loly.config";

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
}

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
    };

    return merged;
  }

  return DEFAULT_CONFIG;
}
