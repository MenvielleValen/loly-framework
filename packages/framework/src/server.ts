import fs from "fs";

import path from "path";
import { runInitIfExists } from "@server/init";
import { setupServer } from "@server/setup";
import { handleApiRequest, handlePageRequest } from "@server/handlers";
import { setupApplication } from "@server/application";

import dotenv from "dotenv";
import { loadChunksFromManifest } from "@router/index";
import { BUILD_FOLDER_NAME } from "@constants/globals";

dotenv.config();

//#region PROD
export interface StartProdServerOptions {
  port?: number;
  rootDir?: string; // raíz del proyecto de la app (ej: apps/example)
  appDir?: string; // por defecto rootDir + "/app"
}

/**
 * Server de producción:
 * - NO arranca bundler
 * - Sirve /static desde {BUILD_FOLDER_NAME}/client (bundle ya buildeado)
 * - Intenta servir SSG desde {BUILD_FOLDER_NAME}/ssg primero
 * - Si no hay SSG para esa ruta, hace SSR como en dev
 */
export async function startProdServer(options: StartProdServerOptions = {}) {
  const port = options.port ?? 3000;
  const projectRoot = options.rootDir ?? process.cwd();
  const serverRoutesDir = path.join(projectRoot, BUILD_FOLDER_NAME, "server");

  if (!fs.existsSync(serverRoutesDir)) {
    console.error(
      `[framework][prod] ERROR: No se encontró el directorio compilado ${BUILD_FOLDER_NAME}/server`,
      serverRoutesDir
    );
  }

  const { app, httpServer } = await setupApplication({
    projectRoot,
  });

  // Ejecutar init.server.js compilado
  await runInitIfExists(projectRoot, { server: httpServer });

  // Setup de rutas y estáticos, pero usando {BUILD_FOLDER_NAME}/server
  const { routes, apiRoutes, notFoundPage } = setupServer(app, {
    projectRoot,
    appDir: serverRoutesDir,
    isDev: false,
  });

  const ssgOutDir = path.join(projectRoot, BUILD_FOLDER_NAME, "ssg");

  // APIs
  app.all("/api/*", async (req, res) => {
    await handleApiRequest({
      apiRoutes,
      urlPath: req.path,
      req,
      res,
      env: "prod",
    });
  });

  const routeChunks = loadChunksFromManifest(projectRoot);
  // Páginas
  app.get("*", async (req, res) => {
    await handlePageRequest({
      routes,
      notFoundPage,
      routeChunks,
      urlPath: req.path,
      req,
      res,
      env: "prod",
      ssgOutDir,
    });
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Prod server corriendo en http://localhost:${port}`);
    console.log(`🧭 Leyendo rutas compiladas desde: ${serverRoutesDir}`);
    console.log(`📦 Cliente servido desde /static ( ${BUILD_FOLDER_NAME}/client )`);
    console.log(`📄 SSG servido desde ${BUILD_FOLDER_NAME}/ssg (si existe)`);
  });
}

//#endregion

export interface StartDevServerOptions {
  port?: number;
  rootDir?: string; // raíz del proyecto de la app (ej: apps/example)
  appDir?: string; // opcional, por defecto rootDir + "/app"
}

/**
 * Server de desarrollo:
 * - Usa Express
 * - Escanea appDir (por defecto `rootDir/app`)
 * - Matchea la URL contra las rutas y hace SSR
 * - Arranca bundler de cliente (Rspack) y sirve /static/client.js
 */
export async function startDevServer(options: StartDevServerOptions = {}) {
  const port = options.port ?? 3000;
  const projectRoot = options.rootDir ?? process.cwd();
  const appDir = options.appDir ?? path.resolve(projectRoot, "app");

  const { app, httpServer } = await setupApplication({
    projectRoot,
  });

  await runInitIfExists(projectRoot, { server: httpServer });

  // Setup de rutas y bundler (con hot reload en dev)
  const { getRoutes } = setupServer(app, {
    projectRoot,
    appDir,
    isDev: true,
  });

  // APIs (en dev recargamos rutas en cada request)
  app.all("/api/*", async (req, res) => {
    const { apiRoutes: currentApiRoutes } = getRoutes!();
    await handleApiRequest({
      apiRoutes: currentApiRoutes,
      urlPath: req.path,
      req,
      res,
      env: "dev",
    });
  });

  // Páginas (en dev recargamos rutas en cada request)
  app.get("*", async (req, res) => {
    const { routes: currentRoutes } = getRoutes!();
    const routeChunks = loadChunksFromManifest(projectRoot);
    
    await handlePageRequest({
      routes: currentRoutes,
      notFoundPage: null, // @TODO Fix 
      routeChunks,
      urlPath: req.path,
      req,
      res,
      env: "dev",
    });
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Dev server corriendo en http://localhost:${port}`);
    console.log(`🧭 Leyendo rutas desde: ${appDir}`);
    console.log(`📦 Cliente servido desde /static/client.js`);
  });
}
