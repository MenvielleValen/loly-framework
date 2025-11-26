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

export interface BuildAppOptions {
  rootDir?: string;
  appDir?: string;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<void> {
  const projectRoot = options.rootDir ?? process.cwd();
  const appDir = options.appDir ?? path.resolve(projectRoot, "app");

  process.env.LOLY_BUILD = "1";

  const routes = loadRoutes(appDir);
  const apiRoutes = loadApiRoutes(appDir);

  const { outDir: serverOutDir } = await buildServerApp(projectRoot, appDir);

  // Load special error pages (Next.js style: _not-found.tsx, _error.tsx)
  const notFoundRoute = loadNotFoundRouteFromFilesystem(appDir);
  const errorRoute = loadErrorRouteFromFilesystem(appDir);

  if (!notFoundRoute) {
    console.warn(
      "[framework][build] No not-found route found. Consider creating app/_not-found.tsx"
    );
  }

  // Create a minimal not-found route if none exists
  const fallbackNotFound: LoadedRoute = notFoundRoute || {
    pattern: "/not-found",
    regex: new RegExp("^/not-found/?$"),
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

  writeRoutesManifest(routes, apiRoutes, fallbackNotFound, errorRoute, projectRoot, serverOutDir, appDir);

  writeClientBoostrapManifest(projectRoot);

  writeClientRoutesManifest(routes, projectRoot, errorRoute);

  await buildClientBundle(projectRoot);

  await buildStaticPages(projectRoot, routes);

  delete process.env.LOLY_BUILD;
}

export { startClientBundler, buildClientBundle } from "./bundler/client";
export { buildServerApp } from "./bundler/server";
export { buildStaticPages } from "./ssg";
