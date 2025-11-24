import path from "path";
import {
  loadApiRoutes,
  loadRoutes,
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

  // 1) Escanear TSX (solo metadata)
  const routes = loadRoutes(appDir);
  const apiRoutes = loadApiRoutes(appDir);

  // 2) Compilar server → produce .fw/server/app/**
  const { outDir: serverOutDir } = await buildServerApp(projectRoot, appDir);

  // 3) Generar manifest apuntando a JS compilado
  writeRoutesManifest(routes, apiRoutes, projectRoot, serverOutDir, appDir);

  // 4) Crear manifest TS para el cliente (usa TSX)
  writeClientRoutesManifest(routes, projectRoot);

  // 5) Bundlear cliente
  await buildClientBundle(projectRoot);

  // 6) SSG (usa loader del server compilado)
  await buildStaticPages(projectRoot, routes);
}

// Re-export bundler functions for direct use if needed
export { startClientBundler, buildClientBundle } from "./bundler/client";
export { buildServerApp } from "./bundler/server";
export { buildStaticPages } from "./ssg";
