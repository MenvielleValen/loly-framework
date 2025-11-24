import express from "express";
import path from "path";
import {
  loadRoutes,
  loadApiRoutes,
  loadRoutesFromManifest,
} from "@router/index";
import { startClientBundler } from "@build/bundler/client";
import { setupHotReload } from "@dev/hot-reload-client";
import { clearAppRequireCache } from "@dev/hot-reload-server";
import { writeClientRoutesManifest } from "@router/index";

export interface ServerSetupOptions {
  projectRoot: string;
  appDir: string;
  isDev: boolean;
}

export interface ServerSetupResult {
  routes: ReturnType<typeof loadRoutes>;
  apiRoutes: ReturnType<typeof loadApiRoutes>;
  getRoutes?: () => {
    routes: ReturnType<typeof loadRoutes>;
    apiRoutes: ReturnType<typeof loadApiRoutes>;
  };
}

/**
 * Configura las rutas y el bundler según el entorno (dev/prod).
 */
export function setupServer(
  app: express.Application,
  options: ServerSetupOptions
): ServerSetupResult {
  const { projectRoot, appDir, isDev } = options;

  if (isDev) {
    // En dev: hot reload y recarga de rutas en cada request
    setupHotReload({ app, appDir });

    function getRoutes() {
      clearAppRequireCache(appDir);
      return loadRoutesFromManifest(projectRoot);
    }

    const { routes: manifestRoutes } = getRoutes();
    writeClientRoutesManifest(manifestRoutes, projectRoot);

    // Bundler de cliente (Rspack)
    const { outDir } = startClientBundler(projectRoot);
    app.use("/static", express.static(outDir));

    return {
      routes: manifestRoutes,
      apiRoutes: loadApiRoutes(appDir),
      getRoutes,
    };
  } else {
    // En prod: rutas estáticas y archivos estáticos
    const { routes, apiRoutes } = loadRoutesFromManifest(projectRoot);

    const clientOutDir = path.join(projectRoot, ".fw", "client");
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
    };
  }
}
