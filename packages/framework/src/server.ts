import fs from "fs";
import path from "path";
import { runInitIfExists } from "@server/init";
import { setupServer } from "@server/setup";
import { setupRoutes } from "@server/routes";
import { setupApplication } from "@server/application";
import { FilesystemRouteLoader, ManifestRouteLoader } from "@router/index";
import { loadConfig, getAppDir, getBuildDir, type FrameworkConfig } from "./config";
import dotenv from "dotenv";

dotenv.config();

export interface StartServerOptions {
  port?: number;
  rootDir?: string;
  appDir?: string;
  isDev?: boolean;
  config?: FrameworkConfig;
}

/**
 * Unified server startup function.
 * Handles both development and production modes.
 *
 * @param options - Server startup options
 */
export async function startServer(options: StartServerOptions = {}) {
  const isDev = options.isDev ?? process.env.NODE_ENV === "development";
  const projectRoot = options.rootDir ?? process.cwd();
  
  // Load configuration
  const config = options.config ?? loadConfig(projectRoot);
  
  // Use config values, but allow overrides from options and environment variables
  // PORT and HOST are standard environment variables in hosting platforms (Render, Heroku, etc.)
  const port = options.port 
    ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : undefined)
    ?? config.server.port;
  
  // In production, default to 0.0.0.0 to be accessible from outside
  // This is required for platforms like Render.com, Heroku, etc.
  const host = process.env.HOST 
    ?? (!isDev ? '0.0.0.0' : undefined)
    ?? config.server.host;
  
  const appDir = options.appDir ?? (isDev
    ? getAppDir(projectRoot, config)
    : path.join(getBuildDir(projectRoot, config), "server"));

  if (!isDev && !fs.existsSync(appDir)) {
    console.error(
      `[framework][prod] ERROR: Compiled directory not found: ${config.directories.build}/server`,
      appDir
    );
    process.exit(1);
  }

  const { app, httpServer } = await setupApplication({
    projectRoot,
  });

  await runInitIfExists(projectRoot, { server: httpServer });

  const { routes, apiRoutes, notFoundPage, errorPage, getRoutes } = setupServer(app, {
    projectRoot,
    appDir,
    isDev,
    config,
  });

  const routeLoader = isDev
    ? new FilesystemRouteLoader(appDir)
    : new ManifestRouteLoader(projectRoot);

  setupRoutes({
    app,
    routes,
    apiRoutes,
    notFoundPage,
    errorPage,
    isDev,
    projectRoot,
    routeLoader,
    getRoutes,
    config,
  });

  httpServer.listen(port, host, () => {
    if (isDev) {
      console.log(`🚀 Dev server running on http://${host}:${port}`);
      console.log(`🧭 Reading routes from: ${appDir}`);
      console.log(`📦 Client served from /static/client.js`);
    } else {
      const buildDir = config.directories.build;
      console.log(`🚀 Prod server running on http://${host}:${port}`);
      console.log(`🧭 Reading compiled routes from: ${appDir}`);
      console.log(`📦 Client served from /static (${buildDir}/client)`);
      console.log(`📄 SSG served from ${buildDir}/ssg (if exists)`);
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
