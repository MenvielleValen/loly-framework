import path from "path";
import { loadRoutes, writeClientRoutesManifest } from "@router/index";
import { buildClientBundle } from "./bundler/client";
import { buildStaticPages } from "./ssg";
import { buildServerApp } from "./bundler/server";

export interface BuildAppOptions {
  rootDir?: string;
  appDir?: string;
}

/**
 * Builds the complete application for production.
 * 
 * Performs the following steps in order:
 * 1. Compiles server-side app code (app/ → .fw/server)
 * 2. Loads routes from compiled server code
 * 3. Generates client routes manifest
 * 4. Builds client bundle (boostrap.ts → .fw/client)
 * 5. Generates static pages for SSG routes (.fw/ssg)
 * 
 * @param options - Build options
 * @param options.rootDir - Project root directory (default: process.cwd())
 * @param options.appDir - Application source directory (default: rootDir/app)
 * 
 * @example
 * await buildApp({
 *   rootDir: '/path/to/project',
 *   appDir: 'app'
 * });
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<void> {
  const projectRoot = options.rootDir ?? process.cwd();
  const sourceAppDir = options.appDir ?? path.resolve(projectRoot, "app");

  // 1) Compile app/ → .fw/server
  const { outDir: serverAppDir } = await buildServerApp(
    projectRoot,
    sourceAppDir
  );

  // 2) Load routes from compiled server code
  const routes = loadRoutes(serverAppDir);

  // 3) Generate client routes manifest
  writeClientRoutesManifest(routes, projectRoot);

  // 4) Build client bundle
  await buildClientBundle(projectRoot);

  // 5) Generate static pages for SSG routes
  await buildStaticPages(projectRoot, routes);

  console.log("[framework][build] Build complete (server + client + SSG).");
}

// Re-export bundler functions for direct use if needed
export { startClientBundler, buildClientBundle } from "./bundler/client";
export { buildServerApp } from "./bundler/server";
export { buildStaticPages } from "./ssg";
