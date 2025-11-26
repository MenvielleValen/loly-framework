import fs from "fs";
import path from "path";
import { runInitIfExists } from "@server/init";
import { setupServer } from "@server/setup";
import { setupRoutes } from "@server/routes";
import { setupApplication } from "@server/application";
import { FilesystemRouteLoader, ManifestRouteLoader } from "@router/index";
import { BUILD_FOLDER_NAME } from "@constants/globals";
import dotenv from "dotenv";

dotenv.config();

export interface StartServerOptions {
  port?: number;
  rootDir?: string;
  appDir?: string;
  isDev?: boolean;
}

/**
 * Unified server startup function.
 * Handles both development and production modes.
 *
 * @param options - Server startup options
 */
export async function startServer(options: StartServerOptions = {}) {
  const isDev = options.isDev ?? process.env.NODE_ENV === "development";
  const port = options.port ?? 3000;
  const projectRoot = options.rootDir ?? process.cwd();
  const appDir = options.appDir ?? (isDev
    ? path.resolve(projectRoot, "app")
    : path.join(projectRoot, BUILD_FOLDER_NAME, "server"));

  if (!isDev && !fs.existsSync(appDir)) {
    console.error(
      `[framework][prod] ERROR: Compiled directory not found: ${BUILD_FOLDER_NAME}/server`,
      appDir
    );
    process.exit(1);
  }

  const { app, httpServer } = await setupApplication({
    projectRoot,
  });

  await runInitIfExists(projectRoot, { server: httpServer });

  const { routes, apiRoutes, notFoundPage, getRoutes } = setupServer(app, {
    projectRoot,
    appDir,
    isDev,
  });

  const routeLoader = isDev
    ? new FilesystemRouteLoader(appDir)
    : new ManifestRouteLoader(projectRoot);

  setupRoutes({
    app,
    routes,
    apiRoutes,
    notFoundPage,
    isDev,
    projectRoot,
    routeLoader,
    getRoutes,
  });

  httpServer.listen(port, () => {
    if (isDev) {
      console.log(`🚀 Dev server running on http://localhost:${port}`);
      console.log(`🧭 Reading routes from: ${appDir}`);
      console.log(`📦 Client served from /static/client.js`);
    } else {
      console.log(`🚀 Prod server running on http://localhost:${port}`);
      console.log(`🧭 Reading compiled routes from: ${appDir}`);
      console.log(`📦 Client served from /static (${BUILD_FOLDER_NAME}/client)`);
      console.log(`📄 SSG served from ${BUILD_FOLDER_NAME}/ssg (if exists)`);
    }
  });
}

export interface StartDevServerOptions {
  port?: number;
  rootDir?: string;
  appDir?: string;
}

/**
 * Development server startup.
 * Wrapper around startServer for backward compatibility.
 *
 * @param options - Server options
 */
export async function startDevServer(options: StartDevServerOptions = {}) {
  return startServer({
    ...options,
    isDev: true,
  });
}

export interface StartProdServerOptions {
  port?: number;
  rootDir?: string;
  appDir?: string;
}

/**
 * Production server startup.
 * Wrapper around startServer for backward compatibility.
 *
 * @param options - Server options
 */
export async function startProdServer(options: StartProdServerOptions = {}) {
  return startServer({
    ...options,
    isDev: false,
  });
}
