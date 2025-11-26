import express from "express";
import path from "path";
import {
  loadRoutes,
  loadApiRoutes,
  loadRoutesFromManifest,
  loadNotFoundFromManifest,
} from "@router/index";
import { startClientBundler } from "@build/bundler/client";
import { setupHotReload } from "@dev/hot-reload-client";
import { clearAppRequireCache } from "@dev/hot-reload-server";
import { writeClientRoutesManifest } from "@router/index";
import { BUILD_FOLDER_NAME } from "@constants/globals";

export interface ServerSetupOptions {
  projectRoot: string;
  appDir: string;
  isDev: boolean;
}

export interface ServerSetupResult {
  routes: ReturnType<typeof loadRoutes>;
  notFoundPage: ReturnType<typeof loadNotFoundFromManifest>;
  apiRoutes: ReturnType<typeof loadApiRoutes>;
  getRoutes?: () => {
    routes: ReturnType<typeof loadRoutes>;
    apiRoutes: ReturnType<typeof loadApiRoutes>;
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
  const { projectRoot, appDir, isDev } = options;

  if (isDev) {
    setupHotReload({ app, appDir });

    function getRoutes() {
      clearAppRequireCache(appDir);
      return loadRoutesFromManifest(projectRoot);
    }

    const { routes: manifestRoutes } = getRoutes();
    const notFoundPage = loadNotFoundFromManifest(projectRoot);
    writeClientRoutesManifest(manifestRoutes, projectRoot);

    const { outDir } = startClientBundler(projectRoot);
    app.use("/static", express.static(outDir));

    return {
      routes: manifestRoutes,
      notFoundPage,
      apiRoutes: loadApiRoutes(appDir),
      getRoutes,
    };
  } else {
    const { routes, apiRoutes } = loadRoutesFromManifest(projectRoot);
    const notFoundPage = loadNotFoundFromManifest(projectRoot);

    const clientOutDir = path.join(projectRoot, BUILD_FOLDER_NAME, "client");
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
      notFoundPage
    };
  }
}
