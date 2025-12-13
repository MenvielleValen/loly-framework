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
import { LoadedRoute, ApiRoute, WssRoute } from "@router/index.types";
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
  wssRoutes: WssRoute[];
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
    ? new FilesystemRouteLoader(appDir, projectRoot)
    : new ManifestRouteLoader(projectRoot);

  if (isDev) {
    const { outDir, waitForBuild } = startClientBundler(projectRoot, "development");
    
    // Callback to reload routes manifest and clear cache when files change
    const onFileChange = async (filePath: string) => {
      const rel = path.relative(appDir, filePath);
      const isPageFile = filePath.includes("page.tsx") || filePath.includes("page.ts") || 
                         filePath.includes("layout.tsx") || filePath.includes("layout.ts") ||
                         filePath.includes("_not-found") || filePath.includes("_error");
      const isTsFile = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
      
      // Clear require cache for ANY TypeScript/TSX file change
      // This ensures components, utilities, hooks, etc. are reloaded correctly
      if (isTsFile) {
        clearAppRequireCache(appDir);
        console.log(`[hot-reload] Cleared require cache for: ${rel}`);
      }
      
      // Reload client routes manifest for page files (affects client-side routing)
      // This is needed when routes are added/removed/changed
      if (isPageFile) {
        const loader = new FilesystemRouteLoader(appDir, projectRoot);
        const newRoutes = loader.loadRoutes();
        writeClientRoutesManifest(newRoutes, projectRoot);
        console.log("[hot-reload] Client routes manifest reloaded");
      }
      
      // Note: 
      // - API routes are already reloaded on each request via getRoutes().apiRoutes
      // - WSS routes require server restart to take effect (Socket.IO setup is one-time)
      // - Components and other files are handled by the bundler (Rspack watch mode)
      //   and the require cache is cleared above to ensure server-side code reloads
    };
    
    setupHotReload({ app, appDir, waitForBuild, onFileChange });
    
    app.use("/static", express.static(outDir));

    const routes = routeLoader.loadRoutes();
    const wssRoutes = routeLoader.loadWssRoutes();
    const notFoundPage = routeLoader.loadNotFoundRoute();
    const errorPage = routeLoader.loadErrorRoute();
    writeClientRoutesManifest(routes, projectRoot);

    // Reuse the same loader instance to benefit from caching
    // Pass projectRoot so it can monitor files outside app/ directory
    const sharedLoader = new FilesystemRouteLoader(appDir, projectRoot);
    
    function getRoutes() {
      clearAppRequireCache(appDir);
      // Invalidate cache to force reload after clearing require cache
      sharedLoader.invalidateCache();
      return {
        routes: sharedLoader.loadRoutes(),
        apiRoutes: sharedLoader.loadApiRoutes(),
      };
    }

    return {
      routes,
      wssRoutes,
      notFoundPage,
      errorPage,
      apiRoutes: routeLoader.loadApiRoutes(),
      getRoutes,
    };
  } else {
    const routes = routeLoader.loadRoutes();
    const apiRoutes = routeLoader.loadApiRoutes();
    const wssRoutes = routeLoader.loadWssRoutes();
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
      wssRoutes,
      notFoundPage,
      errorPage,
    };
  }
}
