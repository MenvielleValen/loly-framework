import fs from "fs";
import path from "path";
import {
  ApiHandler,
  ApiMiddleware,
  ApiRoute,
  LayoutComponent,
  LoadedRoute,
  PageComponent,
  RoutesManifest,
} from "./index.types";
import { buildRegexFromRoutePath } from "./path";
import { loadLoaderForDir } from "./loader";
import { BUILD_FOLDER_NAME } from "@constants/globals";

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
} {
  const manifestPath = path.join(
    projectRoot,
    BUILD_FOLDER_NAME,
    "routes-manifest.json"
  );

  if (!fs.existsSync(manifestPath)) {
    return { routes: [], apiRoutes: [] };
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest: RoutesManifest = JSON.parse(raw);

  const pageRoutes: LoadedRoute[] = [];

  for (const entry of manifest.routes) {
    const routePath = entry.pattern;
    const { regex, paramNames } = buildRegexFromRoutePath(routePath);

    const pageFile = path.join(projectRoot, entry.pageFile);
    const layoutFiles = entry.layoutFiles.map((f) => path.join(projectRoot, f));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pageMod = require(pageFile);
    const component: PageComponent = pageMod.default;

    if (!component) {
      continue;
    }

    const layoutMods = layoutFiles.map((lf) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(lf);
      } catch (err) {
        return null;
      }
    });

    const layouts: LayoutComponent[] = layoutMods
      .filter((m): m is { default: LayoutComponent } => !!m?.default)
      .map((m) => m.default);

    const pageDir = path.dirname(pageFile);
    const { middlewares, loader, dynamic, generateStaticParams } =
      loadLoaderForDir(pageDir);

    pageRoutes.push({
      pattern: routePath,
      regex,
      paramNames: entry.paramNames ?? paramNames,
      component,
      layouts,
      pageFile,
      layoutFiles,
      middlewares,
      loader,
      dynamic: entry.dynamic ?? dynamic,
      generateStaticParams,
    });
  }

  const apiRoutes: ApiRoute[] = [];
  const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

  for (const entry of manifest.apiRoutes) {
    const pattern = entry.pattern;
    const { regex, paramNames } = buildRegexFromRoutePath(pattern);
    const filePath = path.join(projectRoot, entry.file);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(filePath);

    const handlers: Record<string, ApiHandler> = {};
    const methodMiddlewares: Record<string, ApiMiddleware[]> = {};

    for (const m of httpMethods) {
      if (typeof mod[m] === "function") {
        handlers[m] = mod[m] as ApiHandler;
      }
    }

    const globalMiddlewares: ApiMiddleware[] = Array.isArray(mod.beforeApi)
      ? mod.beforeApi
      : [];

    for (const m of httpMethods) {
      const key = `before${m}`;
      const mws = (mod as any)[key];
      if (Array.isArray(mws)) {
        methodMiddlewares[m] = mws as ApiMiddleware[];
      }
    }

    apiRoutes.push({
      pattern,
      regex,
      paramNames: entry.paramNames ?? paramNames,
      handlers,
      middlewares: globalMiddlewares,
      methodMiddlewares,
      filePath,
    });
  }

  return { routes: pageRoutes, apiRoutes };
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
  const manifestPath = path.join(
    projectRoot,
    BUILD_FOLDER_NAME,
    "routes-manifest.json"
  );

  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest: RoutesManifest = JSON.parse(raw);

  const pageFile = path.join(projectRoot, manifest.notFound.pageFile);
  const layoutFiles = manifest.notFound.layoutFiles.map((f) =>
    path.join(projectRoot, f)
  );

  const layoutMods = layoutFiles.map((lf) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(lf);
    } catch (err) {
      return null;
    }
  });

  const layouts: LayoutComponent[] = layoutMods
    .filter((m): m is { default: LayoutComponent } => !!m?.default)
    .map((m) => m.default);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pageMod = require(pageFile);
  const component: PageComponent = pageMod.default;

  if (!component) {
    return null;
  }

  return {
    pattern: "",
    regex: new RegExp(""),
    paramNames: [],
    component,
    layouts: layouts,
    pageFile: pageFile,
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
  const manifestPath = path.join(
    projectRoot,
    BUILD_FOLDER_NAME,
    "routes-manifest.json"
  );

  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest: RoutesManifest = JSON.parse(raw);

  // Check if error page exists in manifest
  const errorEntry = (manifest as any).error;
  if (!errorEntry) {
    return null;
  }

  const pageFile = path.join(projectRoot, errorEntry.pageFile);
  const layoutFiles = (errorEntry.layoutFiles || []).map((f: string) =>
    path.join(projectRoot, f)
  );

  const layoutMods = layoutFiles.map((lf: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(lf);
    } catch (err) {
      return null;
    }
  });

  const layouts: LayoutComponent[] = layoutMods
    .filter((m: any): m is { default: LayoutComponent } => !!m?.default)
    .map((m: { default: LayoutComponent }) => m.default);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pageMod = require(pageFile);
  const component: PageComponent = pageMod.default;

  if (!component) {
    return null;
  }

  return {
    pattern: "/error",
    regex: new RegExp("^/error/?$"),
    paramNames: [],
    component,
    layouts: layouts,
    pageFile: pageFile,
    layoutFiles: [],
    middlewares: [],
    loader: null,
    dynamic: "force-static",
    generateStaticParams: null,
  };
}
