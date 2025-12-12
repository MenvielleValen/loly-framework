import fs from "fs";
import path from "path";
import { runInitIfExists } from "@server/init";
import { setupServer, setupRoutes, setupWssEvents } from "@server/index";
import { setupApplication } from "@server/application";
import { FilesystemRouteLoader, ManifestRouteLoader } from "@router/index";
import {
  loadConfig,
  getAppDir,
  getBuildDir,
  type FrameworkConfig,
} from "./config";
import { createModuleLogger } from "@logger/index";
import dotenv from "dotenv";

// Load .env file if it exists (optional)
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Try default dotenv.config() which looks for .env in current directory
  dotenv.config();
}

const logger = createModuleLogger("server");

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
  const port =
    options.port ??
    (process.env.PORT ? parseInt(process.env.PORT, 10) : undefined) ??
    config.server.port;

  // In production, default to 0.0.0.0 to be accessible from outside
  // This is required for platforms like Render.com, Heroku, etc.
  const host =
    process.env.HOST ?? (!isDev ? "0.0.0.0" : undefined) ?? config.server.host;

  const appDir =
    options.appDir ??
    (isDev
      ? getAppDir(projectRoot, config)
      : path.join(getBuildDir(projectRoot, config), "server"));

  if (!isDev && !fs.existsSync(appDir)) {
    logger.error("Compiled directory not found", undefined, {
      buildDir: config.directories.build,
      appDir,
      environment: "production",
    });
    process.exit(1);
  }

  const { app, httpServer } = await setupApplication({
    projectRoot,
  });

  // Run init.server.ts if it exists (allows user to set up server hooks, middleware, etc.)
  await runInitIfExists(projectRoot, { server: httpServer });

  const { routes, apiRoutes, wssRoutes, notFoundPage, errorPage, getRoutes } =
    setupServer(app, {
      projectRoot,
      appDir,
      isDev,
      config,
    });

  const routeLoader = isDev
    ? new FilesystemRouteLoader(appDir)
    : new ManifestRouteLoader(projectRoot);

  // Set up Socket.IO server and WebSocket event handlers
  setupWssEvents({
    httpServer,
    wssRoutes,
  });

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
      logger.info("🚀 Dev server running", {
        url: `http://${host}:${port}`,
        appDir,
      });
      logger.info("🧭 Reading routes from", { appDir });
      logger.info("📦 Client served from /static/client.js");
    } else {
      const buildDir = config.directories.build;
      logger.info("🚀 Prod server running", {
        url: `http://${host}:${port}`,
        appDir,
        buildDir,
      });
      logger.info("🧭 Reading compiled routes from", { appDir });
      logger.info("📦 Client served from", {
        path: `/static (${buildDir}/client)`,
      });
      logger.info("📄 SSG served from", {
        path: `${buildDir}/ssg (if exists)`,
      });
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
