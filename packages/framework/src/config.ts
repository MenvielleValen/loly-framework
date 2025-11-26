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
    outputFormat: 'cjs' | 'esm';
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
    outputFormat: 'cjs',
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
 */
export function loadConfig(projectRoot: string): FrameworkConfig {
  const configFiles = [
    path.join(projectRoot, 'loly.config.ts'),
    path.join(projectRoot, 'loly.config.js'),
    path.join(projectRoot, 'loly.config.json'),
  ];

  let userConfig: Partial<FrameworkConfig> = {};

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
        break;
      } catch (error) {
        console.warn(`[framework] Failed to load config from ${configFile}:`, error);
      }
    }
  }

  // Merge with defaults
  const config = deepMerge(DEFAULT_CONFIG, userConfig);

  // Validate critical paths
  const appDir = path.join(projectRoot, config.directories.app);
  if (!fs.existsSync(appDir) && process.env.NODE_ENV !== 'test') {
    console.warn(`[framework] App directory not found: ${appDir}`);
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

