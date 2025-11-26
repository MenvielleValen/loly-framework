import fs from "fs";
import path from "path";
import { ApiRoute, LoadedRoute, PageComponent } from "./index.types";
import { PAGE_FILE_REGEX } from "./constants";
import { buildRoutePathFromDir } from "./path";
import { loadLayoutsForDir } from "./layout";
import { loadLoaderForDir } from "./loader";
import { loadRoutesFromManifest, loadNotFoundFromManifest, loadErrorFromManifest, loadChunksFromManifest } from "./loader-routes";
import { loadRoutes } from "./loader-pages";
import { loadApiRoutes } from "./loader-api";
import { BUILD_FOLDER_NAME } from "@constants/globals";

/**
 * Unified interface for loading routes from different sources.
 * Abstracts the difference between filesystem (dev) and manifest (prod) loading.
 */
export interface RouteLoader {
  loadRoutes(): LoadedRoute[];
  loadApiRoutes(): ApiRoute[];
  loadNotFoundRoute(): LoadedRoute | null;
  loadErrorRoute(): LoadedRoute | null;
  loadRouteChunks(): Record<string, string>;
}

/**
 * Loads routes directly from the filesystem.
 * Used in development mode.
 */
export class FilesystemRouteLoader implements RouteLoader {
  constructor(private appDir: string) {}

  loadRoutes(): LoadedRoute[] {
    return loadRoutes(this.appDir);
  }

  loadApiRoutes(): ApiRoute[] {
    return loadApiRoutes(this.appDir);
  }

  loadNotFoundRoute(): LoadedRoute | null {
    return loadNotFoundRouteFromFilesystem(this.appDir);
  }

  loadErrorRoute(): LoadedRoute | null {
    return loadErrorRouteFromFilesystem(this.appDir);
  }

  loadRouteChunks(): Record<string, string> {
    // In dev, route chunks are not critical, return empty
    return {};
  }
}

/**
 * Loads routes from the compiled manifest file.
 * Used in production mode.
 */
export class ManifestRouteLoader implements RouteLoader {
  constructor(private projectRoot: string) {}

  loadRoutes(): LoadedRoute[] {
    const { routes } = loadRoutesFromManifest(this.projectRoot);
    return routes;
  }

  loadApiRoutes(): ApiRoute[] {
    const { apiRoutes } = loadRoutesFromManifest(this.projectRoot);
    return apiRoutes;
  }

  loadNotFoundRoute(): LoadedRoute | null {
    return loadNotFoundFromManifest(this.projectRoot);
  }

  loadErrorRoute(): LoadedRoute | null {
    return loadErrorFromManifest(this.projectRoot);
  }

  loadRouteChunks(): Record<string, string> {
    return loadChunksFromManifest(this.projectRoot);
  }
}

/**
 * Loads the not-found route from the filesystem.
 * Looks for `_not-found.tsx` in the app root (Next.js style).
 * 
 * @param appDir - Root directory of the app
 * @returns LoadedRoute for the not-found page, or null if not found
 */
export function loadNotFoundRouteFromFilesystem(appDir: string): LoadedRoute | null {
  const notFoundCandidates = [
    path.join(appDir, "_not-found.tsx"),
    path.join(appDir, "_not-found.ts"),
    path.join(appDir, "_not-found.jsx"),
    path.join(appDir, "_not-found.js"),
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

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(notFoundFile);
  const component: PageComponent = mod.default;

  if (!component) {
    return null;
  }

  // For _not-found.tsx in root, use appDir as the directory
  const notFoundDir = notFoundFile.includes("_not-found")
    ? appDir
    : path.dirname(notFoundFile);

  const { components: layouts, files: layoutFiles } = loadLayoutsForDir(
    notFoundDir,
    appDir
  );

  const { middlewares, loader, dynamic, generateStaticParams } =
    loadLoaderForDir(notFoundDir);

  return {
    pattern: "/not-found",
    regex: new RegExp("^/not-found/?$"),
    paramNames: [],
    component,
    layouts,
    pageFile: notFoundFile,
    layoutFiles,
    middlewares,
    loader,
    dynamic,
    generateStaticParams,
  };
}

/**
 * Loads the error route from the filesystem.
 * Looks for `_error.tsx` in the app root (Next.js style).
 * 
 * @param appDir - Root directory of the app
 * @returns LoadedRoute for the error page, or null if not found
 */
export function loadErrorRouteFromFilesystem(appDir: string): LoadedRoute | null {
  const errorCandidates = [
    path.join(appDir, "_error.tsx"),
    path.join(appDir, "_error.ts"),
    path.join(appDir, "_error.jsx"),
    path.join(appDir, "_error.js"),
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

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(errorFile);
  const component: PageComponent = mod.default;

  if (!component) {
    return null;
  }

  const { components: layouts, files: layoutFiles } = loadLayoutsForDir(
    appDir,
    appDir
  );

  const { middlewares, loader, dynamic, generateStaticParams } =
    loadLoaderForDir(appDir);

  return {
    pattern: "/error",
    regex: new RegExp("^/error/?$"),
    paramNames: [],
    component,
    layouts,
    pageFile: errorFile,
    layoutFiles,
    middlewares,
    loader,
    dynamic,
    generateStaticParams,
  };
}

