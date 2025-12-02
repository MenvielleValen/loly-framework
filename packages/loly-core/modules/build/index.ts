import path from "path";
import {
  loadApiRoutes,
  LoadedRoute,
  loadRoutes,
  writeClientBoostrapManifest,
  writeClientRoutesManifest,
  writeRoutesManifest,
  loadNotFoundRouteFromFilesystem,
  loadErrorRouteFromFilesystem,
} from "@router/index";
import { buildClientBundle } from "./bundler/client";
import { buildStaticPages } from "./ssg";
import { buildServerApp } from "./bundler/server";
import { NOT_FOUND_PATTERN } from "@constants/globals";
import { loadConfig, getAppDir, type FrameworkConfig } from "@src/config";
import { loadWssRoutes } from "@router/loader-wss";

export interface BuildAppOptions {
  rootDir?: string;
  appDir?: string;
  config?: FrameworkConfig;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<void> {
  const projectRoot = options.rootDir ?? process.cwd();
  const config = options.config ?? loadConfig(projectRoot);
  const appDir = options.appDir ?? getAppDir(projectRoot, config);

  process.env.LOLY_BUILD = "1";

  const routes = loadRoutes(appDir);
  const apiRoutes = loadApiRoutes(appDir);
  const wssRoutes = loadWssRoutes(appDir);

  const { outDir: serverOutDir } = await buildServerApp(projectRoot, appDir);

  // Load special error pages (_not-found.tsx, _error.tsx)
  const notFoundRoute = loadNotFoundRouteFromFilesystem(appDir);
  const errorRoute = loadErrorRouteFromFilesystem(appDir);

  if (!notFoundRoute) {
    console.warn(
      `[framework][build] No not-found route found. Consider creating ${config.directories.app}/${config.conventions.notFound}.tsx`
    );
  }

  // Create a minimal not-found route if none exists
  const fallbackNotFound: LoadedRoute = notFoundRoute || {
    pattern: NOT_FOUND_PATTERN,
    regex: new RegExp(`^${NOT_FOUND_PATTERN}/?$`),
    paramNames: [],
    component: () => null,
    layouts: [],
    pageFile: "",
    layoutFiles: [],
    middlewares: [],
    loader: null,
    dynamic: "force-static",
    generateStaticParams: null,
  };

  writeRoutesManifest({
    routes,
    apiRoutes,
    wssRoutes,
    notFoundRoute: fallbackNotFound,
    errorRoute,
    projectRoot,
    serverOutDir,
    appDir,
  });

  writeClientBoostrapManifest(projectRoot);

  writeClientRoutesManifest(routes, projectRoot);

  await buildClientBundle(projectRoot);

  await buildStaticPages(projectRoot, routes);

  delete process.env.LOLY_BUILD;

  console.log(`[framework][build] Build completed successfully`);
}

export { startClientBundler, buildClientBundle } from "./bundler/client";
export { buildServerApp } from "./bundler/server";
export { buildStaticPages } from "./ssg";
