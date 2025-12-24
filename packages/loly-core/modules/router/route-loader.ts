import fs from "fs";
import path from "path";
import { ApiRoute, LoadedRoute, PageComponent, RouteMiddleware, WssRoute, RoutesManifest } from "./index.types";

import { loadLayoutsForDir } from "./layout";
import { loadServerHookForDir, loadLayoutServerHook } from "./server-hook";
import {
  loadRoutesFromManifest,
  loadNotFoundFromManifest,
  loadErrorFromManifest,
  loadChunksFromManifest,
} from "./loader-routes";
import { readManifest } from "./helpers/routes";
import { loadRoutes } from "./loader-pages";
import { loadApiRoutes } from "./loader-api";
import {
  NOT_FOUND_PATTERN,
  ERROR_PATTERN,
  NOT_FOUND_FILE_PREFIX,
  ERROR_FILE_PREFIX,
} from "@constants/globals";
import { loadWssRoutes, type ExtendedWssRoute } from "./loader-wss";

/**
 * Unified interface for loading routes from different sources.
 * Abstracts the difference between filesystem (dev) and manifest (prod) loading.
 */
export interface RouteLoader {
  loadRoutes(): Promise<LoadedRoute[]>;
  loadApiRoutes(): Promise<ApiRoute[]>;
  loadWssRoutes(): Promise<ExtendedWssRoute[]>;
  loadNotFoundRoute(): Promise<LoadedRoute | null>;
  loadErrorRoute(): Promise<LoadedRoute | null>;
  loadRouteChunks(): Record<string, string>;
}

/**
 * File change tracking for intelligent cache invalidation.
 */
interface FileStats {
  mtime: number;
  size: number;
}

/**
 * Cache entry for routes with file tracking.
 */
interface RoutesCache {
  routes: LoadedRoute[];
  apiRoutes: ApiRoute[];
  wssRoutes: ExtendedWssRoute[];
  notFoundRoute: LoadedRoute | null;
  errorRoute: LoadedRoute | null;
  fileStats: Map<string, FileStats>;
  timestamp: number;
}

/**
 * Directories to always skip when tracking file changes.
 * These are directories that never contain code affecting routes.
 */
const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.loly',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage',
  '.vscode',
  '.idea',
  '.turbo',
  '.swc',
]);

/**
 * Gets all relevant files for change detection.
 * Monitors the entire project root (except excluded directories) to catch
 * any changes in TypeScript/JavaScript files, regardless of directory structure.
 * 
 * This approach doesn't assume any specific directory names (lib, components, etc.)
 * and will detect changes anywhere in the project that could affect routes.
 * 
 * @param appDir - App directory path (used for context, but projectRoot is scanned)
 * @param projectRoot - Project root directory path to scan
 */
function getRelevantFiles(appDir: string, projectRoot: string): string[] {
  const files: string[] = [];
  const projectRootNormalized = path.resolve(projectRoot);
  
  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) {
      return;
    }
    
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip directories that never contain source code affecting routes
        // Note: We skip dot-prefixed dirs except those we know might have source (like .github/scripts)
        // but in practice, most dot-dirs are config/build artifacts
        if (SKIP_DIRECTORIES.has(entry.name)) {
          continue;
        }
        
        // Skip hidden directories (starting with .) unless they're known source dirs
        // This is a safe default - user can reorganize if needed
        if (entry.name.startsWith('.')) {
          continue;
        }
        
        walk(fullPath);
      } else {
        // Track all TypeScript/JavaScript files that could affect routes
        // This includes components, utils, libs, hooks - any code that routes might import
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  // Walk the entire project root - this catches changes in any directory structure
  // The appDir will be included automatically if it's within projectRoot
  walk(projectRootNormalized);
  
  return files;
}

/**
 * Checks if any relevant files have changed since cache was created.
 */
function hasFilesChanged(
  appDir: string,
  projectRoot: string,
  cachedStats: Map<string, FileStats>
): boolean {
  const currentFiles = getRelevantFiles(appDir, projectRoot);
  const currentFilesSet = new Set(currentFiles);
  
  // Check if any cached file was deleted
  for (const [filePath] of cachedStats.entries()) {
    if (!currentFilesSet.has(filePath)) {
      return true; // File was deleted
    }
  }
  
  // Check if any file changed (new or modified)
  for (const filePath of currentFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    
    const stats = fs.statSync(filePath);
    const cachedStat = cachedStats.get(filePath);
    
    if (!cachedStat) {
      return true; // New file
    }
    
    // Check if mtime or size changed
    if (
      stats.mtimeMs !== cachedStat.mtime ||
      stats.size !== cachedStat.size
    ) {
      return true; // File was modified
    }
  }
  
  return false;
}

/**
 * Builds a map of file stats for change detection.
 */
function buildFileStats(files: string[]): Map<string, FileStats> {
  const statsMap = new Map<string, FileStats>();
  
  for (const filePath of files) {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      statsMap.set(filePath, {
        mtime: stats.mtimeMs,
        size: stats.size,
      });
    }
  }
  
  return statsMap;
}

/**
 * Loads routes directly from the filesystem with intelligent caching.
 * Used in development mode.
 * 
 * Caches routes and only reloads when files change, reducing overhead.
 * Monitors both app directory and common source directories outside app.
 */
export class FilesystemRouteLoader implements RouteLoader {
  private cache: RoutesCache | null = null;
  private readonly cacheMaxAge = 1000; // Maximum cache age in ms (1 second fallback)

  constructor(
    private appDir: string,
    private projectRoot: string = appDir
  ) {
    // If projectRoot not provided, use appDir's parent or appDir itself
    if (this.projectRoot === this.appDir) {
      // Try to find project root by going up from appDir
      let current = path.resolve(this.appDir);
      while (current !== path.dirname(current)) {
        if (fs.existsSync(path.join(current, 'package.json'))) {
          this.projectRoot = current;
          break;
        }
        current = path.dirname(current);
      }
    }
  }

  /**
   * Invalidates the cache, forcing a reload on next access.
   */
  invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Checks if cache is still valid, invalidates if files changed.
   */
  private ensureCacheValid(): void {
    if (!this.cache) {
      return; // No cache, will be built on next access
    }

    // Check if cache is too old (fallback safety)
    const now = Date.now();
    if (now - this.cache.timestamp > this.cacheMaxAge) {
      // Verify files haven't changed
      if (hasFilesChanged(this.appDir, this.projectRoot, this.cache.fileStats)) {
        this.cache = null;
      } else {
        // Cache is still valid, just update timestamp
        this.cache.timestamp = now;
      }
    }
  }

  async loadRoutes(): Promise<LoadedRoute[]> {
    this.ensureCacheValid();
    
    if (!this.cache || hasFilesChanged(this.appDir, this.projectRoot, this.cache.fileStats)) {
      const routes = await loadRoutes(this.appDir);
      const files = getRelevantFiles(this.appDir, this.projectRoot);
      const fileStats = buildFileStats(files);
      
      // Initialize or update cache
      this.cache = {
        routes,
        apiRoutes: this.cache?.apiRoutes || [],
        wssRoutes: this.cache?.wssRoutes || [],
        notFoundRoute: this.cache?.notFoundRoute ?? null,
        errorRoute: this.cache?.errorRoute ?? null,
        fileStats,
        timestamp: Date.now(),
      };
    }
    
    return this.cache.routes;
  }

  async loadApiRoutes(): Promise<ApiRoute[]> {
    this.ensureCacheValid();
    
    // Ensure cache exists
    if (!this.cache) {
      await this.loadRoutes(); // This will initialize the cache
    }
    
    // Ensure we have a cache at this point
    if (!this.cache) {
      throw new Error('Failed to initialize route cache');
    }
    
    if (hasFilesChanged(this.appDir, this.projectRoot, this.cache.fileStats) || this.cache.apiRoutes.length === 0) {
      // Files changed or not loaded yet, reload
      const files = getRelevantFiles(this.appDir, this.projectRoot);
      const fileStats = buildFileStats(files);
      this.cache.apiRoutes = await loadApiRoutes(this.appDir);
      this.cache.fileStats = fileStats;
      this.cache.timestamp = Date.now();
    }
    
    return this.cache.apiRoutes;
  }

  async loadWssRoutes(): Promise<ExtendedWssRoute[]> {
    this.ensureCacheValid();
    
    if (!this.cache) {
      await this.loadRoutes(); // Initialize cache
    }
    
    if (!this.cache) {
      throw new Error('Failed to initialize route cache');
    }
    
    if (hasFilesChanged(this.appDir, this.projectRoot, this.cache.fileStats) || this.cache.wssRoutes.length === 0) {
      const files = getRelevantFiles(this.appDir, this.projectRoot);
      const fileStats = buildFileStats(files);
      this.cache.wssRoutes = await loadWssRoutes(this.appDir);
      this.cache.fileStats = fileStats;
      this.cache.timestamp = Date.now();
    }
    
    return this.cache.wssRoutes;
  }

  async loadNotFoundRoute(): Promise<LoadedRoute | null> {
    this.ensureCacheValid();
    
    if (!this.cache) {
      await this.loadRoutes(); // Initialize cache
    }
    
    if (!this.cache) {
      throw new Error('Failed to initialize route cache');
    }
    
    if (hasFilesChanged(this.appDir, this.projectRoot, this.cache.fileStats) || this.cache.notFoundRoute === undefined) {
      const files = getRelevantFiles(this.appDir, this.projectRoot);
      const fileStats = buildFileStats(files);
      this.cache.notFoundRoute = await loadNotFoundRouteFromFilesystem(this.appDir, this.projectRoot);
      this.cache.fileStats = fileStats;
      this.cache.timestamp = Date.now();
    }
    
    return this.cache.notFoundRoute;
  }

  async loadErrorRoute(): Promise<LoadedRoute | null> {
    this.ensureCacheValid();
    
    if (!this.cache) {
      await this.loadRoutes(); // Initialize cache
    }
    
    if (!this.cache) {
      throw new Error('Failed to initialize route cache');
    }
    
    if (hasFilesChanged(this.appDir, this.projectRoot, this.cache.fileStats) || this.cache.errorRoute === undefined) {
      const files = getRelevantFiles(this.appDir, this.projectRoot);
      const fileStats = buildFileStats(files);
      this.cache.errorRoute = await loadErrorRouteFromFilesystem(this.appDir, this.projectRoot);
      this.cache.fileStats = fileStats;
      this.cache.timestamp = Date.now();
    }
    
    return this.cache.errorRoute;
  }

  loadRouteChunks(): Record<string, string> {
    // In dev, route chunks are not critical, return empty
    return {};
  }
}

/**
 * Cache entry for manifest-based routes.
 * In production, routes are static and don't change, so we cache everything.
 */
interface ManifestCache {
  routes?: LoadedRoute[];
  apiRoutes?: ApiRoute[];
  wssRoutes?: ExtendedWssRoute[];
  notFoundRoute?: LoadedRoute | null;
  errorRoute?: LoadedRoute | null;
  routeChunks?: Record<string, string>;
  manifest?: RoutesManifest | null;
}

/**
 * Loads routes from the compiled manifest file.
 * Used in production mode.
 * 
 * Implements caching to avoid re-reading and re-processing the manifest
 * on every request, since routes are static in production.
 */
export class ManifestRouteLoader implements RouteLoader {
  private cache: ManifestCache = {};

  constructor(private projectRoot: string) {}

  /**
   * Gets the manifest, using cache if available.
   * The manifest is read once and cached for the lifetime of the loader.
   */
  private getManifest(): RoutesManifest | null {
    if (this.cache.manifest !== undefined) {
      return this.cache.manifest;
    }

    const manifest = readManifest(this.projectRoot);
    this.cache.manifest = manifest;
    return manifest;
  }

  async loadRoutes(): Promise<LoadedRoute[]> {
    if (this.cache.routes) {
      return this.cache.routes;
    }

    const { routes } = await loadRoutesFromManifest(this.projectRoot);
    this.cache.routes = routes;
    return routes;
  }

  async loadApiRoutes(): Promise<ApiRoute[]> {
    if (this.cache.apiRoutes) {
      return this.cache.apiRoutes;
    }

    const { apiRoutes } = await loadRoutesFromManifest(this.projectRoot);
    this.cache.apiRoutes = apiRoutes;
    return apiRoutes;
  }

  async loadWssRoutes(): Promise<ExtendedWssRoute[]> {
    if (this.cache.wssRoutes) {
      return this.cache.wssRoutes;
    }

    const { wssRoutes } = await loadRoutesFromManifest(this.projectRoot);
    this.cache.wssRoutes = wssRoutes;
    return wssRoutes;
  }

  async loadNotFoundRoute(): Promise<LoadedRoute | null> {
    if (this.cache.notFoundRoute !== undefined) {
      return this.cache.notFoundRoute;
    }

    const route = await loadNotFoundFromManifest(this.projectRoot);
    this.cache.notFoundRoute = route;
    return route;
  }

  async loadErrorRoute(): Promise<LoadedRoute | null> {
    if (this.cache.errorRoute !== undefined) {
      return this.cache.errorRoute;
    }

    const route = await loadErrorFromManifest(this.projectRoot);
    this.cache.errorRoute = route;
    return route;
  }

  loadRouteChunks(): Record<string, string> {
    if (this.cache.routeChunks) {
      return this.cache.routeChunks;
    }

    const chunks = loadChunksFromManifest(this.projectRoot);
    this.cache.routeChunks = chunks;
    return chunks;
  }
}

/**
 * Loads the not-found route from the filesystem.
 * Looks for `_not-found.tsx` in the app root (Next.js style).
 *
 * @param appDir - Root directory of the app
 * @param projectRoot - Root directory of the project (where package.json is located)
 * @returns LoadedRoute for the not-found page, or null if not found
 */
export async function loadNotFoundRouteFromFilesystem(
  appDir: string,
  projectRoot: string
): Promise<LoadedRoute | null> {
  const notFoundCandidates = [
    path.join(appDir, `${NOT_FOUND_FILE_PREFIX}.tsx`),
    path.join(appDir, `${NOT_FOUND_FILE_PREFIX}.ts`),
    path.join(appDir, `${NOT_FOUND_FILE_PREFIX}.jsx`),
    path.join(appDir, `${NOT_FOUND_FILE_PREFIX}.js`),
    // Fallback to old style for backward compatibility
    path.join(appDir, "not-found", "page.tsx"),
    path.join(appDir, "not-found", "page.ts"),
    path.join(appDir, "not-found", "page.jsx"),
    path.join(appDir, "not-found", "page.js"),
  ];

  let notFoundFile: string | null = null;
  for (const candidate of notFoundCandidates) {
    if (fs.existsSync(candidate)) {
      notFoundFile = candidate;
      break;
    }
  }

  if (!notFoundFile) {
    return null;
  }

  const { loadDefaultExport } = await import("./utils/module-loader");
  const component = await loadDefaultExport<PageComponent>(notFoundFile, {
    projectRoot: projectRoot,
  });

  if (!component) {
    return null;
  }

  // For _not-found.tsx in root, use appDir as the directory
  const notFoundDir = notFoundFile.includes(NOT_FOUND_FILE_PREFIX)
    ? appDir
    : path.dirname(notFoundFile);

  const { components: layouts, files: layoutFiles } = await loadLayoutsForDir(
    notFoundDir,
    appDir
  );

  // Load server hooks and middlewares for each layout
  // For a layout at app/layout.tsx, we look for app/layout.server.hook.ts (same directory)
  const layoutServerHooks: (typeof serverHook)[] = [];
  const layoutMiddlewares: RouteMiddleware[][] = [];
  for (const layoutFile of layoutFiles) {
    const layoutHookData = await loadLayoutServerHook(layoutFile, projectRoot);
    if (layoutHookData) {
      layoutServerHooks.push(layoutHookData.serverHook);
      layoutMiddlewares.push(layoutHookData.middlewares);
    } else {
      layoutServerHooks.push(null);
      layoutMiddlewares.push([]);
    }
  }

  const { middlewares, serverHook, dynamic, generateStaticParams } =
    await loadServerHookForDir(notFoundDir, projectRoot);

  return {
    pattern: NOT_FOUND_PATTERN,
    regex: new RegExp(`^${NOT_FOUND_PATTERN}/?$`),
    paramNames: [],
    component,
    layouts,
    pageFile: notFoundFile,
    layoutFiles,
    middlewares,
    loader: serverHook, // Keep 'loader' field name for backward compatibility
    layoutServerHooks, // Server hooks for each layout (same order as layouts)
    layoutMiddlewares, // Middlewares for each layout (same order as layouts)
    dynamic,
    generateStaticParams,
  };
}

/**
 * Loads the error route from the filesystem.
 * Looks for `_error.tsx` in the app root (Next.js style).
 *
 * @param appDir - Root directory of the app
 * @param projectRoot - Root directory of the project (where package.json is located)
 * @returns LoadedRoute for the error page, or null if not found
 */
export async function loadErrorRouteFromFilesystem(
  appDir: string,
  projectRoot: string
): Promise<LoadedRoute | null> {
  const errorCandidates = [
    path.join(appDir, `${ERROR_FILE_PREFIX}.tsx`),
    path.join(appDir, `${ERROR_FILE_PREFIX}.ts`),
    path.join(appDir, `${ERROR_FILE_PREFIX}.jsx`),
    path.join(appDir, `${ERROR_FILE_PREFIX}.js`),
  ];

  let errorFile: string | null = null;
  for (const candidate of errorCandidates) {
    if (fs.existsSync(candidate)) {
      errorFile = candidate;
      break;
    }
  }

  if (!errorFile) {
    return null;
  }

  const { loadDefaultExport } = await import("./utils/module-loader");
  const component = await loadDefaultExport<PageComponent>(errorFile, {
    projectRoot: projectRoot,
  });

  if (!component) {
    return null;
  }

  const { components: layouts, files: layoutFiles } = await loadLayoutsForDir(
    appDir,
    appDir
  );

  // Load server hooks and middlewares for each layout
  // For a layout at app/layout.tsx, we look for app/layout.server.hook.ts (same directory)
  const layoutServerHooks: (typeof serverHook)[] = [];
  const layoutMiddlewares: RouteMiddleware[][] = [];
  for (const layoutFile of layoutFiles) {
    const layoutHookData = await loadLayoutServerHook(layoutFile, projectRoot);
    if (layoutHookData) {
      layoutServerHooks.push(layoutHookData.serverHook);
      layoutMiddlewares.push(layoutHookData.middlewares);
    } else {
      layoutServerHooks.push(null);
      layoutMiddlewares.push([]);
    }
  }

  const { middlewares, serverHook, dynamic, generateStaticParams } =
    await loadServerHookForDir(appDir, projectRoot);

  return {
    pattern: ERROR_PATTERN,
    regex: new RegExp(`^${ERROR_PATTERN}/?$`),
    paramNames: [],
    component,
    layouts,
    pageFile: errorFile,
    layoutFiles,
    middlewares,
    loader: serverHook, // Keep 'loader' field name for backward compatibility
    layoutServerHooks, // Server hooks for each layout (same order as layouts)
    layoutMiddlewares, // Middlewares for each layout (same order as layouts)
    dynamic,
    generateStaticParams,
  };
}
