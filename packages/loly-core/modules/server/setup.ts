import express from "express";
import path from "path";
import fs from "fs";
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
import { getBuildDir, getStaticDir } from "@src/config";

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
  getRoutes?: () => Promise<{
    routes: LoadedRoute[];
    apiRoutes: ApiRoute[];
  }>;
}

/**
 * Sets up static files middleware from public directory.
 * Files are served from the root URL (e.g., public/sitemap.xml -> /sitemap.xml).
 *
 * @param app - Express application instance
 * @param projectRoot - Project root directory
 * @param config - Framework configuration
 */
function setupStaticFiles(
  app: express.Application,
  projectRoot: string,
  config?: FrameworkConfig
): void {
  if (!config) return;

  const staticDir = getStaticDir(projectRoot, config);

  // Only register middleware if the static directory exists
  if (fs.existsSync(staticDir)) {
    // Serve static files from public/ directory at the root URL
    // This must be registered BEFORE /static and route handlers to have priority
    app.use(
      express.static(staticDir, {
        // In production, add caching headers for better performance
        maxAge: process.env.NODE_ENV === "production" ? "1y" : 0,
        immutable: process.env.NODE_ENV === "production",
      })
    );
  }
}

/**
 * Sets up routes and bundler based on environment (dev/prod).
 *
 * @param app - Express application instance
 * @param options - Setup options
 * @returns Server setup result with routes and handlers
 */
export async function setupServer(
  app: express.Application,
  options: ServerSetupOptions
): Promise<ServerSetupResult> {
  const { projectRoot, appDir, isDev, config } = options;

  // Set up static files from public/ directory FIRST (before /static and routes)
  // This ensures files like sitemap.xml and robots.txt are served with priority
  setupStaticFiles(app, projectRoot, config);

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
        const newRoutes = await loader.loadRoutes();
        writeClientRoutesManifest(newRoutes, projectRoot);
        console.log("[hot-reload] Client routes manifest reloaded");
      }
      
      // Note: 
      // - API routes are already reloaded on each request via getRoutes().apiRoutes
      // - WSS routes require server restart to take effect (Socket.IO setup is one-time)
      // - Components and other files are handled by the bundler (Rspack watch mode)
      //   and the require cache is cleared above to ensure server-side code reloads
    };
    
    setupHotReload({ app, appDir, projectRoot, waitForBuild, onFileChange });
    
    app.use("/static", express.static(outDir));

    const routes = await routeLoader.loadRoutes();
    const wssRoutes = await routeLoader.loadWssRoutes();
    const notFoundPage = await routeLoader.loadNotFoundRoute();
    const errorPage = await routeLoader.loadErrorRoute();
    writeClientRoutesManifest(routes, projectRoot);

    // Reuse the same loader instance to benefit from caching
    // Pass projectRoot so it can monitor files outside app/ directory
    const sharedLoader = new FilesystemRouteLoader(appDir, projectRoot);
    
    async function getRoutes() {
      clearAppRequireCache(appDir);
      // Invalidate cache to force reload after clearing require cache
      sharedLoader.invalidateCache();
      return {
        routes: await sharedLoader.loadRoutes(),
        apiRoutes: await sharedLoader.loadApiRoutes(),
      };
    }

    return {
      routes,
      wssRoutes,
      notFoundPage,
      errorPage,
      apiRoutes: await routeLoader.loadApiRoutes(),
      getRoutes,
    };
  } else {
    const routes = await routeLoader.loadRoutes();
    const apiRoutes = await routeLoader.loadApiRoutes();
    const wssRoutes = await routeLoader.loadWssRoutes();
    const notFoundPage = await routeLoader.loadNotFoundRoute();
    const errorPage = await routeLoader.loadErrorRoute();

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
