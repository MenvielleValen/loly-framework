import path from "path";
import { loadRoutes, writeClientRoutesManifest } from "@router/index";
import { buildClientBundle } from "./client";
import { buildStaticPages } from "./ssg";
import { buildServerApp } from "./server"; // 👈 nuevo

export interface BuildAppOptions {
  rootDir?: string;
  appDir?: string;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const projectRoot = options.rootDir ?? process.cwd();
  const sourceAppDir = options.appDir ?? path.resolve(projectRoot, "app");

  // 0) Compilar app/ → .fw/server
  const { outDir: serverAppDir } = await buildServerApp(projectRoot, sourceAppDir);

  // 1) Rutas, pero ahora desde JS compilado
  const routes = loadRoutes(serverAppDir);

  // 2) Manifest de rutas cliente
  writeClientRoutesManifest(routes, projectRoot);

  // 3) Bundle de cliente (este ya está bien así) :contentReference[oaicite:1]{index=1}
  await buildClientBundle(projectRoot);

  // 4) SSG: ahora usa rutas que apuntan a módulos JS en .fw/server :contentReference[oaicite:2]{index=2}
  await buildStaticPages(projectRoot, routes);

  console.log("[framework][build] Build completo (server + client + SSG).");
}