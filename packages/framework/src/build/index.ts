import { loadRoutes, writeClientRoutesManifest } from "../router";
import { buildClientBundle } from "./client";

export async function buildApp(projectRoot: string, appDir: string) {
  console.log("[framework][build] Iniciando build de app...");
  const routes = loadRoutes(appDir);
  writeClientRoutesManifest(routes, projectRoot);
  await buildClientBundle(projectRoot);
  console.log("[framework][build] Build completo (rutas + cliente)");
}
