import express from "express";
import path from "path";
import {
  FilesystemRouteLoader,
  ManifestRouteLoader,
  RouteLoader,
  writeClientRoutesManifest,
} from "@router/index";
import { startClientBundler } from "@build/bundler/client";
import { setupHotReload } from "@dev/hot-reload-client";
import { clearAppRequireCache } from "@dev/hot-reload-server";
import { LoadedRoute, ApiRoute } from "@router/index.types";
import { BUILD_FOLDER_NAME } from "@constants/globals";
import { getBuildDir } from "@src/config";

export { RouteLoader };

import type { FrameworkConfig } from "@src/config";

export interface ServerSetupOptions {
  projectRoot: string;
  appDir: string;
  isDev: boolean;
  config?: FrameworkConfig;
}

export interface ServerSetupResult {
  routes: LoadedRoute[];
  notFoundPage: LoadedRoute | null;
  errorPage: LoadedRoute | null;
  apiRoutes: ApiRoute[];
  getRoutes?: () => {
    routes: LoadedRoute[];
    apiRoutes: ApiRoute[];
  };
}

/**
 * Sets up routes and bundler based on environment (dev/prod).
 *
 * @param app - Express application instance
 * @param options - Setup options
 * @returns Server setup result with routes and handlers
 */
export function setupServer(
  app: express.Application,
  options: ServerSetupOptions
): ServerSetupResult {
  const { projectRoot, appDir, isDev, config } = options;

  const routeLoader: RouteLoader = isDev
    ? new FilesystemRouteLoader(appDir)
    : new ManifestRouteLoader(projectRoot);

  if (isDev) {
    setupHotReload({ app, appDir });

    const routes = routeLoader.loadRoutes();
    const notFoundPage = routeLoader.loadNotFoundRoute();
    const errorPage = routeLoader.loadErrorRoute();
    writeClientRoutesManifest(routes, projectRoot);

    const { outDir } = startClientBundler(projectRoot);
    app.use("/static", express.static(outDir));

    function getRoutes() {
      clearAppRequireCache(appDir);
      const loader = new FilesystemRouteLoader(appDir);
      return {
        routes: loader.loadRoutes(),
        apiRoutes: loader.loadApiRoutes(),
      };
    }

    return {
      routes,
      notFoundPage,
      errorPage,
      apiRoutes: routeLoader.loadApiRoutes(),
      getRoutes,
    };
  } else {
    const routes = routeLoader.loadRoutes();
    const apiRoutes = routeLoader.loadApiRoutes();
    const notFoundPage = routeLoader.loadNotFoundRoute();
    const errorPage = routeLoader.loadErrorRoute();

    const buildDir = config ? getBuildDir(projectRoot, config) : path.join(projectRoot, BUILD_FOLDER_NAME);
    const clientOutDir = path.join(buildDir, "client");
    app.use(
      "/static",
      express.static(clientOutDir, {
        maxAge: "1y",
        immutable: true,
      })
    );

    return {
      routes,
      apiRoutes,
      notFoundPage,
      errorPage,
    };
  }
}
