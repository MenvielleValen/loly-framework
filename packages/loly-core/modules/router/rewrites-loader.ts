import fs from "fs";
import path from "path";
import type { Request } from "express";
import type {
  RewriteConfig,
  RewriteRule,
  CompiledRewriteRule,
} from "./rewrites";
import { compileRewriteRules } from "./rewrites";

/**
 * Unified interface for loading rewrites from different sources.
 * Abstracts the difference between filesystem (dev) and manifest (prod) loading.
 */
export interface RewriteLoader {
  loadRewrites(): Promise<CompiledRewriteRule[]>;
}

/**
 * File change tracking for intelligent cache invalidation.
 */
interface FileStats {
  mtime: number;
  size: number;
}

/**
 * Cache entry for rewrites with file tracking.
 */
interface RewritesCache {
  rewrites: CompiledRewriteRule[];
  fileStats: FileStats | null;
  timestamp: number;
}

/**
 * Loads rewrites directly from the filesystem with intelligent caching.
 * Used in development mode.
 * 
 * Caches rewrites and only reloads when rewrites.config.ts changes.
 */
export class FilesystemRewriteLoader implements RewriteLoader {
  private cache: RewritesCache | null = null;
  private readonly cacheMaxAge = 1000; // Maximum cache age in ms (1 second fallback)

  constructor(private projectRoot: string) {}

  /**
   * Invalidates the cache, forcing a reload on next access.
   */
  invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Finds the rewrites config file.
   * Looks for rewrites.config.ts, rewrites.config.js, or rewrites.config.json
   */
  private findRewritesConfig(): string | null {
    const candidates = [
      path.join(this.projectRoot, "rewrites.config.ts"),
      path.join(this.projectRoot, "rewrites.config.js"),
      path.join(this.projectRoot, "rewrites.config.json"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Checks if the rewrites config file has changed.
   */
  private hasConfigChanged(configPath: string): boolean {
    if (!this.cache || !this.cache.fileStats) {
      return true; // No cache, needs to load
    }

    if (!fs.existsSync(configPath)) {
      return this.cache.rewrites.length > 0; // Config was deleted
    }

    const stats = fs.statSync(configPath);
    const cachedStats = this.cache.fileStats;

    return (
      stats.mtimeMs !== cachedStats.mtime || stats.size !== cachedStats.size
    );
  }

  /**
   * Loads rewrites from a config file.
   */
  private async loadRewritesFromFile(
    configPath: string
  ): Promise<RewriteRule[]> {
    const ext = path.extname(configPath);

    if (ext === ".json") {
      // JSON config
      const content = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      return Array.isArray(config) ? config : [];
    }

    // TypeScript/JavaScript config
    // Clear require cache to ensure fresh load
    delete require.cache[require.resolve(configPath)];

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(configPath);
    const config = mod.default || mod;

    if (typeof config === "function") {
      // Async function - execute it
      return await config();
    }

    if (Array.isArray(config)) {
      return config;
    }

    throw new Error(
      `Invalid rewrites config in ${configPath}. Expected array or function returning array.`
    );
  }

  /**
   * Checks if cache is still valid, invalidates if config changed.
   */
  private ensureCacheValid(): void {
    if (!this.cache) {
      return; // No cache, will be built on next access
    }

    // Check if cache is too old (fallback safety)
    const now = Date.now();
    if (now - this.cache.timestamp > this.cacheMaxAge) {
      const configPath = this.findRewritesConfig();
      if (configPath && this.hasConfigChanged(configPath)) {
        this.cache = null;
      } else {
        // Cache is still valid, just update timestamp
        this.cache.timestamp = now;
      }
    }
  }

  async loadRewrites(): Promise<CompiledRewriteRule[]> {
    this.ensureCacheValid();

    const configPath = this.findRewritesConfig();

    if (!configPath) {
      // No config file, return empty array
      if (this.cache && this.cache.rewrites.length === 0) {
        return this.cache.rewrites; // Return cached empty array
      }
      this.cache = {
        rewrites: [],
        fileStats: null,
        timestamp: Date.now(),
      };
      return [];
    }

    if (!this.cache || this.hasConfigChanged(configPath)) {
      // Load and compile rewrites
      const rules = await this.loadRewritesFromFile(configPath);
      const compiled = compileRewriteRules(rules);

      // Get file stats for change tracking
      const stats = fs.statSync(configPath);
      const fileStats: FileStats = {
        mtime: stats.mtimeMs,
        size: stats.size,
      };

      this.cache = {
        rewrites: compiled,
        fileStats,
        timestamp: Date.now(),
      };
    }

    return this.cache.rewrites;
  }
}

/**
 * Rewrites manifest structure.
 */
export interface RewritesManifest {
  version: 1;
  rewrites: RewriteRule[];
}

/**
 * Loads rewrites from the compiled manifest file.
 * Used in production mode.
 * 
 * Implements caching to avoid re-reading and re-processing the manifest
 * on every request, since rewrites are static in production.
 */
export class ManifestRewriteLoader implements RewriteLoader {
  private cache: CompiledRewriteRule[] | null = null;
  private manifestPath: string;

  constructor(projectRoot: string) {
    this.manifestPath = path.join(projectRoot, ".loly", "rewrites-manifest.json");
  }

  /**
   * Reads the rewrites manifest from disk.
   */
  private readManifest(): RewritesManifest | null {
    if (!fs.existsSync(this.manifestPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.manifestPath, "utf-8");
      return JSON.parse(content) as RewritesManifest;
    } catch (error) {
      console.warn(
        `Failed to read rewrites manifest from ${this.manifestPath}:`,
        error
      );
      return null;
    }
  }

  async loadRewrites(): Promise<CompiledRewriteRule[]> {
    if (this.cache) {
      return this.cache;
    }

    const manifest = this.readManifest();
    if (!manifest || !manifest.rewrites) {
      this.cache = [];
      return [];
    }

    // Compile rewrites from manifest
    // Note: Functions cannot be serialized, so they won't be in the manifest
    // Only static rewrites are supported in production
    const compiled = compileRewriteRules(manifest.rewrites);
    this.cache = compiled;
    return compiled;
  }
}

/**
 * Creates a RewriteLoader instance based on the environment.
 * 
 * @param projectRoot - Project root directory
 * @param isDev - Whether running in development mode
 * @returns RewriteLoader instance
 */
export function createRewriteLoader(
  projectRoot: string,
  isDev: boolean
): RewriteLoader {
  if (isDev) {
    return new FilesystemRewriteLoader(projectRoot);
  } else {
    return new ManifestRewriteLoader(projectRoot);
  }
}

