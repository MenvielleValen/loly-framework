import path from "path";
import {
  loadApiRoutes,
  LoadedRoute,
  loadRoutes,
  writeClientBoostrapManifest,
  writeClientRoutesManifest,
  writeRoutesManifest,
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

  const notFoundRoute = routes.find(r => r.pattern === '/not-found');
  const filteredRoutes = routes.filter(r => r.pattern !== '/not-found');

  if (!notFoundRoute) {
    console.warn(
      "[framework][build] No not-found route found. Consider creating app/not-found/page.tsx"
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

  writeRoutesManifest(filteredRoutes, apiRoutes, fallbackNotFound, projectRoot, serverOutDir, appDir);

  writeClientBoostrapManifest(projectRoot);

  writeClientRoutesManifest(routes, projectRoot);

  await buildClientBundle(projectRoot);

  await buildStaticPages(projectRoot, routes);

  delete process.env.LOLY_BUILD;
}

export { startClientBundler, buildClientBundle } from "./bundler/client";
export { buildServerApp } from "./bundler/server";
export { buildStaticPages } from "./ssg";
