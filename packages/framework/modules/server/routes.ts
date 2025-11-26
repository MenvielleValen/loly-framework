import express from "express";
import { LoadedRoute, ApiRoute } from "@router/index.types";
import { handleApiRequest, handlePageRequest } from "./handlers";
import { RouteLoader } from "@router/index";
import { BUILD_FOLDER_NAME } from "@constants/globals";
import path from "path";

export interface SetupRoutesOptions {
  app: express.Application;
  routes: LoadedRoute[];
  apiRoutes: ApiRoute[];
  notFoundPage: LoadedRoute | null;
  isDev: boolean;
  projectRoot: string;
  routeLoader: RouteLoader;
  getRoutes?: () => {
    routes: LoadedRoute[];
    apiRoutes: ApiRoute[];
  };
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
    isDev,
    projectRoot,
    routeLoader,
    getRoutes,
  } = options;

  // Cache route chunks - they don't change during runtime
  const routeChunks = routeLoader.loadRouteChunks();

  const ssgOutDir = isDev
    ? undefined
    : path.join(projectRoot, BUILD_FOLDER_NAME, "ssg");

  app.all("/api/*", async (req, res) => {
    const apiRoutes = isDev && getRoutes
      ? getRoutes().apiRoutes
      : initialApiRoutes;

    await handleApiRequest({
      apiRoutes,
      urlPath: req.path,
      req,
      res,
      env: isDev ? "dev" : "prod",
    });
  });

  app.get("*", async (req, res) => {
    let routes = initialRoutes;
    let currentNotFoundPage = notFoundPage;

    if (isDev && getRoutes) {
      routes = getRoutes().routes;
      // In dev, reload not-found on each request to support hot-reload
      currentNotFoundPage = routeLoader.loadNotFoundRoute();
    }

    await handlePageRequest({
      routes,
      notFoundPage: currentNotFoundPage,
      routeChunks,
      urlPath: req.path,
      req,
      res,
      env: isDev ? "dev" : "prod",
      ssgOutDir,
    });
  });
}

