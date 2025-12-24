import path from "path";
import fs from "fs";
import { BUILD_FOLDER_NAME } from "../constants/globals";

/**
 * Framework configuration interface.
 * 
 * Allows customization of framework behavior without code changes.
 */
export interface FrameworkConfig {
  // Directory structure
  directories: {
    app: string;           // Default: 'app'
    build: string;         // Default: '.loly'
    static: string;        // Default: 'public'
  };
  
  // File naming conventions
  conventions: {
    page: string;          // Default: 'page'
    layout: string;        // Default: 'layout'
    notFound: string;      // Default: '_not-found'
    error: string;         // Default: '_error'
    api: string;           // Default: 'route'
  };
  
  // Routing
  routing: {
    trailingSlash: 'always' | 'never' | 'ignore';
    caseSensitive: boolean;
    basePath: string;      // Default: ''
  };
  
  // Build
  build: {
    clientBundler: 'rspack' | 'webpack' | 'vite';
    serverBundler: 'esbuild' | 'tsup' | 'swc';
  };
  
  // Server
  server: {
    adapter: 'express' | 'fastify' | 'koa';
    port: number;
    host: string;
  };
  
  // Rendering
  rendering: {
    framework: 'react' | 'preact' | 'vue' | 'svelte';
    streaming: boolean;
    ssr: boolean;
    ssg: boolean;
  };
  
  // Plugins (to be implemented in Phase 2)
  plugins?: any[];
  
  // Image optimization
  images?: ImageConfig;
}

/**
 * Remote pattern for image domain whitelisting.
 */
export interface RemotePattern {
  protocol?: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname?: string;
}

/**
 * Image optimization configuration.
 */
export interface ImageConfig {
  // Remote image domains
  remotePatterns?: RemotePattern[];
  domains?: string[]; // Legacy format, like Next.js
  
  // Image sizes for srcset generation
  deviceSizes?: number[];
  imageSizes?: number[];
  
  // Supported formats
  formats?: ('image/webp' | 'image/avif')[];
  
  // Default quality (1-100)
  quality?: number;
  
  // Minimum cache TTL in seconds
  minimumCacheTTL?: number;
  
  // Allow SVG images (security risk if enabled)
  dangerouslyAllowSVG?: boolean;
  
  // Content Security Policy for SVG
  contentSecurityPolicy?: string;
  
  // Maximum image dimensions
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Default framework configuration.
 */
export const DEFAULT_CONFIG: FrameworkConfig = {
  directories: {
    app: 'app',
    build: BUILD_FOLDER_NAME,
    static: 'public',
  },
  conventions: {
    page: 'page',
    layout: 'layout',
    notFound: '_not-found',
    error: '_error',
    api: 'route',
  },
  routing: {
    trailingSlash: 'ignore',
    caseSensitive: false,
    basePath: '',
  },
  build: {
    clientBundler: 'rspack',
    serverBundler: 'esbuild',
  },
  server: {
    adapter: 'express',
    port: 3000,
    host: 'localhost',
  },
  rendering: {
    framework: 'react',
    streaming: true,
    ssr: true,
    ssg: true,
  },
  plugins: [],
  images: {
    remotePatterns: [],
    domains: [],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    quality: 75,
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    maxWidth: 3840,
    maxHeight: 3840,
  },
};

/**
 * Deep merge utility for configuration objects.
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      const targetValue = result[key];
      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue as any);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }
  
  return result;
}

/**
 * Configuration validation errors.
 */
export class ConfigValidationError extends Error {
  constructor(message: string, public readonly errors: string[] = []) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validates framework configuration.
 * 
 * @param config - Configuration to validate
 * @param projectRoot - Root directory of the project
 * @throws ConfigValidationError if validation fails
 */
function validateConfig(config: FrameworkConfig, projectRoot: string): void {
  const errors: string[] = [];

  // Validate directories
  if (!config.directories.app || typeof config.directories.app !== 'string') {
    errors.push('config.directories.app must be a non-empty string');
  } else {
    const appDir = path.join(projectRoot, config.directories.app);
    if (!fs.existsSync(appDir) && process.env.NODE_ENV !== 'test') {
      errors.push(
        `App directory not found: ${config.directories.app}\n` +
        `  Expected at: ${appDir}\n` +
        `  💡 Suggestion: Create the directory or update config.directories.app`
      );
    }
  }

  if (!config.directories.build || typeof config.directories.build !== 'string') {
    errors.push('config.directories.build must be a non-empty string');
  }

  if (!config.directories.static || typeof config.directories.static !== 'string') {
    errors.push('config.directories.static must be a non-empty string');
  }

  // Validate conventions
  const conventionKeys = ['page', 'layout', 'notFound', 'error', 'api'] as const;
  for (const key of conventionKeys) {
    if (!config.conventions[key] || typeof config.conventions[key] !== 'string') {
      errors.push(`config.conventions.${key} must be a non-empty string`);
    }
  }

  // Validate routing
  if (!['always', 'never', 'ignore'].includes(config.routing.trailingSlash)) {
    errors.push(
      `config.routing.trailingSlash must be 'always', 'never', or 'ignore'\n` +
      `  Received: ${JSON.stringify(config.routing.trailingSlash)}\n` +
      `  💡 Suggestion: Use one of the valid values: 'always' | 'never' | 'ignore'`
    );
  }

  if (typeof config.routing.caseSensitive !== 'boolean') {
    errors.push('config.routing.caseSensitive must be a boolean');
  }

  if (typeof config.routing.basePath !== 'string') {
    errors.push('config.routing.basePath must be a string');
  } else if (config.routing.basePath && !config.routing.basePath.startsWith('/')) {
    errors.push(
      `config.routing.basePath must start with '/' (if not empty)\n` +
      `  Received: ${JSON.stringify(config.routing.basePath)}\n` +
      `  💡 Suggestion: Use an empty string '' or a path starting with '/', e.g., '/api'`
    );
  }

  // Validate build
  const validClientBundlers = ['rspack', 'webpack', 'vite'];
  if (!validClientBundlers.includes(config.build.clientBundler)) {
    errors.push(
      `config.build.clientBundler must be one of: ${validClientBundlers.join(', ')}\n` +
      `  Received: ${JSON.stringify(config.build.clientBundler)}`
    );
  }

  const validServerBundlers = ['esbuild', 'tsup', 'swc'];
  if (!validServerBundlers.includes(config.build.serverBundler)) {
    errors.push(
      `config.build.serverBundler must be one of: ${validServerBundlers.join(', ')}\n` +
      `  Received: ${JSON.stringify(config.build.serverBundler)}`
    );
  }

  // Validate server
  const validAdapters = ['express', 'fastify', 'koa'];
  if (!validAdapters.includes(config.server.adapter)) {
    errors.push(
      `config.server.adapter must be one of: ${validAdapters.join(', ')}\n` +
      `  Received: ${JSON.stringify(config.server.adapter)}`
    );
  }

  if (typeof config.server.port !== 'number' || config.server.port < 1 || config.server.port > 65535) {
    errors.push(
      `config.server.port must be a number between 1 and 65535\n` +
      `  Received: ${JSON.stringify(config.server.port)}`
    );
  }

  if (!config.server.host || typeof config.server.host !== 'string') {
    errors.push('config.server.host must be a non-empty string');
  }

  // Validate rendering
  const validFrameworks = ['react', 'preact', 'vue', 'svelte'];
  if (!validFrameworks.includes(config.rendering.framework)) {
    errors.push(
      `config.rendering.framework must be one of: ${validFrameworks.join(', ')}\n` +
      `  Received: ${JSON.stringify(config.rendering.framework)}`
    );
  }

  if (typeof config.rendering.streaming !== 'boolean') {
    errors.push('config.rendering.streaming must be a boolean');
  }

  if (typeof config.rendering.ssr !== 'boolean') {
    errors.push('config.rendering.ssr must be a boolean');
  }

  if (typeof config.rendering.ssg !== 'boolean') {
    errors.push('config.rendering.ssg must be a boolean');
  }

  // Validate images config if provided
  if (config.images) {
    if (config.images.quality !== undefined) {
      if (typeof config.images.quality !== 'number' || config.images.quality < 1 || config.images.quality > 100) {
        errors.push('config.images.quality must be a number between 1 and 100');
      }
    }
    
    if (config.images.minimumCacheTTL !== undefined) {
      if (typeof config.images.minimumCacheTTL !== 'number' || config.images.minimumCacheTTL < 0) {
        errors.push('config.images.minimumCacheTTL must be a non-negative number');
      }
    }
    
    if (config.images.deviceSizes) {
      if (!Array.isArray(config.images.deviceSizes) || config.images.deviceSizes.some(s => typeof s !== 'number' || s <= 0)) {
        errors.push('config.images.deviceSizes must be an array of positive numbers');
      }
    }
    
    if (config.images.imageSizes) {
      if (!Array.isArray(config.images.imageSizes) || config.images.imageSizes.some(s => typeof s !== 'number' || s <= 0)) {
        errors.push('config.images.imageSizes must be an array of positive numbers');
      }
    }
    
    if (config.images.formats) {
      const validFormats = ['image/webp', 'image/avif'];
      if (!Array.isArray(config.images.formats) || config.images.formats.some(f => !validFormats.includes(f))) {
        errors.push(`config.images.formats must be an array containing only: ${validFormats.join(', ')}`);
      }
    }
    
    if (config.images.remotePatterns) {
      if (!Array.isArray(config.images.remotePatterns)) {
        errors.push('config.images.remotePatterns must be an array');
      } else {
        config.images.remotePatterns.forEach((pattern, idx) => {
          if (!pattern.hostname || typeof pattern.hostname !== 'string') {
            errors.push(`config.images.remotePatterns[${idx}].hostname must be a non-empty string`);
          }
          if (pattern.protocol && !['http', 'https'].includes(pattern.protocol)) {
            errors.push(`config.images.remotePatterns[${idx}].protocol must be 'http' or 'https'`);
          }
        });
      }
    }
    
    if (config.images.domains) {
      if (!Array.isArray(config.images.domains) || config.images.domains.some(d => typeof d !== 'string')) {
        errors.push('config.images.domains must be an array of strings');
      }
    }
  }

  // If there are errors, throw with detailed message
  if (errors.length > 0) {
    const errorMessage = [
      '❌ Configuration validation failed:',
      '',
      ...errors.map((err, i) => `${i + 1}. ${err}`),
      '',
      '💡 Please check your loly.config.ts file and fix the errors above.',
    ].join('\n');

    throw new ConfigValidationError(errorMessage, errors);
  }
}

/**
 * Loads framework configuration from project root.
 * 
 * Looks for configuration in the following order:
 * 1. loly.config.ts (TypeScript)
 * 2. loly.config.js (JavaScript)
 * 3. loly.config.json (JSON)
 * 
 * Merges user config with defaults and validates.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Framework configuration
 * @throws ConfigValidationError if configuration is invalid
 */
export function loadConfig(projectRoot: string): FrameworkConfig {
  const configFiles = [
    path.join(projectRoot, 'loly.config.ts'),
    path.join(projectRoot, 'loly.config.js'),
    path.join(projectRoot, 'loly.config.json'),
  ];

  let userConfig: Partial<FrameworkConfig> = {};
  let loadedConfigFile: string | null = null;

  // Try to load config file
  for (const configFile of configFiles) {
    if (fs.existsSync(configFile)) {
      try {
        if (configFile.endsWith('.json')) {
          // Load JSON config
          const content = fs.readFileSync(configFile, 'utf-8');
          userConfig = JSON.parse(content);
        } else {
          // Load TS/JS config (requires require/import)
          // In production, these should be compiled
          // For now, we'll use require with tsx in dev
          if (process.env.NODE_ENV === 'development') {
            require('tsx/cjs');
          }
          const mod = require(configFile);
          userConfig = typeof mod.default === 'function' 
            ? mod.default(process.env.NODE_ENV)
            : (mod.default || mod.config || mod);
        }
        loadedConfigFile = path.relative(projectRoot, configFile);
        break;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new ConfigValidationError(
          `Failed to load configuration from ${path.relative(projectRoot, configFile)}:\n` +
          `  ${errorMessage}\n` +
          `  💡 Suggestion: Check that your config file exports a valid configuration object`
        );
      }
    }
  }

  // Merge with defaults
  const config = deepMerge(DEFAULT_CONFIG, userConfig);

  // Validate configuration
  try {
    validateConfig(config, projectRoot);
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      // Enhance error message with config file info
      if (loadedConfigFile) {
        error.message = `[Configuration Error in ${loadedConfigFile}]\n\n${error.message}`;
      }
      throw error;
    }
    throw error;
  }

  return config;
}

/**
 * Gets the resolved app directory path.
 * 
 * @param projectRoot - Root directory of the project
 * @param config - Framework configuration
 * @returns Resolved app directory path
 */
export function getAppDir(projectRoot: string, config: FrameworkConfig): string {
  return path.resolve(projectRoot, config.directories.app);
}

/**
 * Gets the resolved build directory path.
 * 
 * @param projectRoot - Root directory of the project
 * @param config - Framework configuration
 * @returns Resolved build directory path
 */
export function getBuildDir(projectRoot: string, config: FrameworkConfig): string {
  return path.join(projectRoot, config.directories.build);
}

/**
 * Gets the resolved static directory path.
 * 
 * @param projectRoot - Root directory of the project
 * @param config - Framework configuration
 * @returns Resolved static directory path
 */
export function getStaticDir(projectRoot: string, config: FrameworkConfig): string {
  return path.resolve(projectRoot, config.directories.static);
}

