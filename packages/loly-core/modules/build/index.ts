import path from "path";
import fs from "fs";
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
import { writeRewritesManifest } from "@router/rewrites-manifest";
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

  // Register tsx/esm loader BEFORE setting LOLY_BUILD and loading modules
  // This allows Node.js to load .ts/.tsx files during build process
  // IMPORTANT: This must complete before any TypeScript files are imported
  try {
    // Try to resolve tsx from project root (where it's typically installed)
    // tsx/esm resolves to dist/esm/index.mjs according to package.json exports
    const tsxPath = path.join(projectRoot, "node_modules", "tsx", "dist", "esm", "index.mjs");
    if (fs.existsSync(tsxPath)) {
      const { pathToFileURL } = await import("url");
      const tsxUrl = pathToFileURL(tsxPath).href;
      await import(tsxUrl);
    } else {
      // Fallback: try bare import (might work if tsx is hoisted or in a monorepo)
      // @ts-expect-error - tsx/esm may not have type definitions, but it exists at runtime
      await import("tsx/esm");
    }
    // Give Node.js a tick to register the loader hooks
    await new Promise(resolve => setImmediate(resolve));
  } catch (error) {
    // tsx might not be available, but continue anyway
    // Some environments might have pre-compiled files
    console.warn("[framework][build] tsx/esm loader could not be registered:", error instanceof Error ? error.message : String(error));
  }

  process.env.LOLY_BUILD = "1";

  const routes = await loadRoutes(appDir);
  const apiRoutes = await loadApiRoutes(appDir);
  const wssRoutes = await loadWssRoutes(appDir);

  const { outDir: serverOutDir } = await buildServerApp(projectRoot, appDir, config);

  // Load special error pages (_not-found.tsx, _error.tsx)
  const notFoundRoute = await loadNotFoundRouteFromFilesystem(appDir, projectRoot);
  const errorRoute = await loadErrorRouteFromFilesystem(appDir, projectRoot);

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

  // Generate rewrites manifest
  await writeRewritesManifest(projectRoot);

  await buildClientBundle(projectRoot);

  await buildStaticPages(projectRoot, routes, config);

  delete process.env.LOLY_BUILD;

  console.log(`[framework][build] Build completed successfully`);
}

export { startClientBundler, buildClientBundle } from "./bundler/client";
export { buildServerApp } from "./bundler/server";
export { buildStaticPages } from "./ssg";
