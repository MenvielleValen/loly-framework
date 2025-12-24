import express from "express";
import { LoadedRoute, ApiRoute, WssRoute } from "@router/index.types";
import { handleApiRequest, handlePageRequest } from "./handlers";
import { handleImageRequest } from "./handlers/image";
import { RouteLoader, RewriteLoader, createRewriteLoader } from "@router/index";
import { BUILD_FOLDER_NAME } from "@constants/globals";
import { getBuildDir, type FrameworkConfig } from "@src/config";
import { getServerConfig } from "@server/config";
import path from "path";

export interface SetupRoutesOptions {
  app: express.Application;
  routes: LoadedRoute[];
  apiRoutes: ApiRoute[];
  notFoundPage: LoadedRoute | null;
  errorPage: LoadedRoute | null;
  isDev: boolean;
  projectRoot: string;
  routeLoader: RouteLoader;
  getRoutes?: () => Promise<{
    routes: LoadedRoute[];
    apiRoutes: ApiRoute[];
  }>;
  config?: FrameworkConfig;
}

/**
 * Creates and caches a RewriteLoader instance.
 * The loader is cached and reused for all requests.
 */
let cachedRewriteLoader: RewriteLoader | null = null;
let cachedProjectRoot: string | null = null;
let cachedIsDev: boolean | null = null;

function getRewriteLoader(projectRoot: string, isDev: boolean): RewriteLoader {
  if (
    cachedRewriteLoader &&
    cachedProjectRoot === projectRoot &&
    cachedIsDev === isDev
  ) {
    return cachedRewriteLoader;
  }

  cachedRewriteLoader = createRewriteLoader(projectRoot, isDev);
  cachedProjectRoot = projectRoot;
  cachedIsDev = isDev;
  return cachedRewriteLoader;
}

/**
 * Sets up route handlers for the Express application.
 * Unifies logic between dev and prod environments.
 *
 * @param options - Route setup options
 */
export function setupRoutes(options: SetupRoutesOptions): void {
  const {
    app,
    routes: initialRoutes,
    apiRoutes: initialApiRoutes,
    notFoundPage,
    errorPage,
    isDev,
    projectRoot,
    routeLoader,
    getRoutes,
    config,
  } = options;

  // Cache route chunks - they don't change during runtime
  const routeChunks = routeLoader.loadRouteChunks();

  // Create rewrite loader (cached and reused)
  const rewriteLoader = getRewriteLoader(projectRoot, isDev);

  // SSG directory - available in both dev and prod if files exist
  const ssgOutDir = path.join(
    config ? getBuildDir(projectRoot, config) : path.join(projectRoot, BUILD_FOLDER_NAME),
    "ssg"
  );

  // Image optimization endpoint - must be registered before /api/* and catch-all routes
  if (config) {
    app.get("/_loly/image", async (req, res) => {
      await handleImageRequest({
        req,
        res,
        projectRoot,
        config,
      });
    });
  }

  app.all("/api/*", async (req, res) => {
    const apiRoutes = isDev && getRoutes
      ? (await getRoutes()).apiRoutes
      : initialApiRoutes;

    // Get rate limit configuration for auto-application
    const serverConfig = await getServerConfig(projectRoot);
    const strictPatterns = serverConfig.rateLimit?.strictPatterns || [];
    const rateLimitConfig = serverConfig.rateLimit;

    await handleApiRequest({
      apiRoutes,
      urlPath: req.path,
      req,
      res,
      env: isDev ? "dev" : "prod",
      strictRateLimitPatterns: strictPatterns,
      rateLimitConfig,
      rewriteLoader,
    });
  });

  app.get("*", async (req, res) => {
    let routes = initialRoutes;
    let currentNotFoundPage = notFoundPage;

    if (isDev && getRoutes) {
      routes = (await getRoutes()).routes;
      // In dev, reload not-found on each request to support hot-reload
      currentNotFoundPage = await routeLoader.loadNotFoundRoute();
    }

    const currentErrorPage = isDev && getRoutes
      ? await routeLoader.loadErrorRoute()
      : errorPage;

    await handlePageRequest({
      routes,
      notFoundPage: currentNotFoundPage,
      errorPage: currentErrorPage,
      routeChunks,
      urlPath: req.path,
      req,
      res,
      env: isDev ? "dev" : "prod",
      ssgOutDir,
      theme: req.cookies?.theme || "light",
      projectRoot,
      config,
      rewriteLoader,
    });
  });
}

