import fs from "fs";
import path from "path";
import {
  ApiRoute,
  LoadedRoute,
  WssRoute,
} from "./index.types";
import { loadServerHookForDir, loadLayoutServerHook } from "./server-hook";
import { BUILD_FOLDER_NAME, ERROR_PATTERN } from "@constants/globals";
import {
  extractApiHandlers,
  extractApiMiddlewares,
  extractRouteRegex,
  extractWssHandlers,
  extractDefineWssRoute,
  loadLayouts,
  loadModuleSafely,
  loadPageComponent,
  readManifest,
} from "./helpers/routes";
import type { ExtendedWssRoute } from "./loader-wss";

/**
 * Loads page and API routes from the routes manifest file.
 * Used in production to avoid filesystem scanning.
 *
 * @param projectRoot - Root directory of the project
 * @returns Object containing loaded routes and API routes
 */
export function loadRoutesFromManifest(projectRoot: string): {
  routes: LoadedRoute[];
  apiRoutes: ApiRoute[];
  wssRoutes: ExtendedWssRoute[];
} {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    return { routes: [], apiRoutes: [], wssRoutes: [] };
  }

  const pageRoutes: LoadedRoute[] = [];

  for (const entry of manifest.routes) {
    const { regex, paramNames } = extractRouteRegex(
      entry.pattern,
      entry.paramNames
    );

    const component = loadPageComponent(entry.pageFile, projectRoot);
    if (!component) {
      continue;
    }

    const layouts = loadLayouts(entry.layoutFiles, projectRoot);
    const pageFile = path.join(projectRoot, entry.pageFile);
    const layoutFiles = entry.layoutFiles.map((f) =>
      path.join(projectRoot, f)
    );
    const pageDir = path.dirname(pageFile);
    
    // Load server hooks for each layout (root → specific, same order as layouts)
    // For a layout at app/layout.tsx, we look for app/layout.server.hook.ts (same directory)
    const layoutServerHooks: (typeof serverHook)[] = [];
    for (const layoutFile of layoutFiles) {
      const layoutServerHook = loadLayoutServerHook(layoutFile);
      layoutServerHooks.push(layoutServerHook);
    }
    
    const { middlewares, serverHook, dynamic, generateStaticParams } =
      loadServerHookForDir(pageDir);

    pageRoutes.push({
      pattern: entry.pattern,
      regex,
      paramNames,
      component,
      layouts,
      pageFile,
      layoutFiles,
      middlewares,
      loader: serverHook, // Keep 'loader' field name for backward compatibility
      layoutServerHooks, // Server hooks for each layout (same order as layouts)
      dynamic: entry.dynamic ?? dynamic,
      generateStaticParams,
    });
  }

  const apiRoutes: ApiRoute[] = [];
  const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

  for (const entry of manifest.apiRoutes) {
    const { regex, paramNames } = extractRouteRegex(
      entry.pattern,
      entry.paramNames
    );
    const filePath = path.join(projectRoot, entry.file);
    const mod = loadModuleSafely(filePath);

    if (!mod) {
      continue;
    }

    const handlers = extractApiHandlers(mod, httpMethods);
    const { global: globalMiddlewares, methodSpecific: methodMiddlewares } =
      extractApiMiddlewares(mod, httpMethods);

    apiRoutes.push({
      pattern: entry.pattern,
      regex,
      paramNames,
      handlers,
      middlewares: globalMiddlewares,
      methodMiddlewares,
      filePath,
    });
  }

  const wssRoutes: ExtendedWssRoute[] = [];

  for (const entry of manifest.wssRoutes) {
    const { regex, paramNames } = extractRouteRegex(
      entry.pattern,
      entry.paramNames
    );
    const filePath = path.join(projectRoot, entry.file);
    const mod = loadModuleSafely(filePath);

    if (!mod) {
      continue;
    }

    // Extract namespace from pattern (same logic as loader-wss.ts)
    let namespace = entry.pattern.replace(/^\/wss/, "");
    if (!namespace.startsWith("/")) {
      namespace = "/" + namespace;
    }
    if (namespace === "") {
      namespace = "/";
    }

    // Try to extract new format route (normalized)
    let normalized = null;
    try {
      normalized = extractDefineWssRoute(mod, namespace);
    } catch (error) {
      // If new format fails, fall back to legacy format
      console.warn(
        `[loly:realtime] Failed to extract normalized route from ${filePath}:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    // Extract handlers (for backwards compatibility or if normalized failed)
    const handlers = extractWssHandlers(mod, entry.events || []);
    const { global: globalMiddlewares, methodSpecific: methodMiddlewares } =
      extractApiMiddlewares(mod, []);

    // If normalized exists, also extract handlers from it for backwards compatibility
    if (normalized) {
      for (const [eventName, eventDef] of normalized.events.entries()) {
        handlers[eventName] = eventDef.handler as any; // WssHandler is different from ApiHandler
      }
    }

    wssRoutes.push({
      pattern: entry.pattern,
      regex,
      paramNames,
      handlers,
      middlewares: globalMiddlewares,
      methodMiddlewares,
      filePath,
      normalized: normalized || undefined, // Store normalized structure (use undefined instead of null)
    });
  }

  return { routes: pageRoutes, apiRoutes, wssRoutes };
}

/**
 * Loads route chunks mapping from the manifest file.
 *
 * @param projectRoot - Root directory of the project
 * @returns Record mapping route patterns to chunk names
 */
export function loadChunksFromManifest(projectRoot: string): Record<string, string> {
  const chunksPath = path.join(
    projectRoot,
    BUILD_FOLDER_NAME,
    "route-chunks.json"
  );
  let routeChunks: Record<string, string> = {};
  if (fs.existsSync(chunksPath)) {
    try {
      routeChunks = JSON.parse(fs.readFileSync(chunksPath, "utf-8"));
    } catch (err) {
      // Silently fail if chunks file is invalid
    }
  }

  return routeChunks;
}

/**
 * Loads the not-found route from the routes manifest.
 *
 * @param projectRoot - Root directory of the project
 * @returns LoadedRoute for the not-found page, or null if not found
 */
export function loadNotFoundFromManifest(
  projectRoot: string
): LoadedRoute | null {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    return null;
  }

  const component = loadPageComponent(manifest.notFound.pageFile, projectRoot);
  if (!component) {
    return null;
  }

  const layouts = loadLayouts(manifest.notFound.layoutFiles, projectRoot);
  const pageFile = path.join(projectRoot, manifest.notFound.pageFile);

  return {
    pattern: "",
    regex: new RegExp(""),
    paramNames: [],
    component,
    layouts,
    pageFile,
    layoutFiles: [],
    middlewares: [],
    loader: null,
    dynamic: "force-static",
    generateStaticParams: null,
  };
}

/**
 * Loads the error route from the routes manifest.
 *
 * @param projectRoot - Root directory of the project
 * @returns LoadedRoute for the error page, or null if not found
 */
export function loadErrorFromManifest(
  projectRoot: string
): LoadedRoute | null {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    return null;
  }

  // Check if error page exists in manifest
  const errorEntry = (manifest as any).error;
  if (!errorEntry) {
    return null;
  }

  const component = loadPageComponent(errorEntry.pageFile, projectRoot);
  if (!component) {
    return null;
  }

  const layoutFiles = (errorEntry.layoutFiles || []) as string[];
  const layouts = loadLayouts(layoutFiles, projectRoot);
  const pageFile = path.join(projectRoot, errorEntry.pageFile);

  return {
    pattern: ERROR_PATTERN,
    regex: new RegExp(`^${ERROR_PATTERN}/?$`),
    paramNames: [],
    component,
    layouts,
    pageFile,
    layoutFiles: [],
    middlewares: [],
    loader: null,
    dynamic: "force-static",
    generateStaticParams: null,
  };
}
