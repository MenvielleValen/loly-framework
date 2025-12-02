import fs from "fs";
import path from "path";
import { ApiRoute, LoadedRoute, PageComponent, WssRoute } from "./index.types";

import { loadLayoutsForDir } from "./layout";
import { loadLoaderForDir } from "./loader";
import {
  loadRoutesFromManifest,
  loadNotFoundFromManifest,
  loadErrorFromManifest,
  loadChunksFromManifest,
} from "./loader-routes";
import { loadRoutes } from "./loader-pages";
import { loadApiRoutes } from "./loader-api";
import {
  NOT_FOUND_PATTERN,
  ERROR_PATTERN,
  NOT_FOUND_FILE_PREFIX,
  ERROR_FILE_PREFIX,
} from "@constants/globals";
import { loadWssRoutes } from "./loader-wss";

/**
 * Unified interface for loading routes from different sources.
 * Abstracts the difference between filesystem (dev) and manifest (prod) loading.
 */
export interface RouteLoader {
  loadRoutes(): LoadedRoute[];
  loadApiRoutes(): ApiRoute[];
  loadWssRoutes(): WssRoute[];
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

  loadWssRoutes(): WssRoute[] {
    return loadWssRoutes(this.appDir);
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

  loadWssRoutes(): WssRoute[] {
    const { wssRoutes } = loadRoutesFromManifest(this.projectRoot);
    return wssRoutes;
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
export function loadNotFoundRouteFromFilesystem(
  appDir: string
): LoadedRoute | null {
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

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(notFoundFile);
  const component: PageComponent = mod.default;

  if (!component) {
    return null;
  }

  // For _not-found.tsx in root, use appDir as the directory
  const notFoundDir = notFoundFile.includes(NOT_FOUND_FILE_PREFIX)
    ? appDir
    : path.dirname(notFoundFile);

  const { components: layouts, files: layoutFiles } = loadLayoutsForDir(
    notFoundDir,
    appDir
  );

  const { middlewares, loader, dynamic, generateStaticParams } =
    loadLoaderForDir(notFoundDir);

  return {
    pattern: NOT_FOUND_PATTERN,
    regex: new RegExp(`^${NOT_FOUND_PATTERN}/?$`),
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
export function loadErrorRouteFromFilesystem(
  appDir: string
): LoadedRoute | null {
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
    pattern: ERROR_PATTERN,
    regex: new RegExp(`^${ERROR_PATTERN}/?$`),
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
