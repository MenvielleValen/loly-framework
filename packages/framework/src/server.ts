import http from "http";
import express from "express";
import path from "path";
import { runInitIfExists } from "@server/init";
import { setupServer } from "@server/setup";
import { handleApiRequest, handlePageRequest } from "@server/handlers";

//#region PROD
export interface StartProdServerOptions {
  port?: number;
  rootDir?: string; // raíz del proyecto de la app (ej: apps/example)
  appDir?: string; // por defecto rootDir + "/app"
}

/**
 * Server de producción:
 * - NO arranca bundler
 * - Sirve /static desde .fw/client (bundle ya buildeado)
 * - Intenta servir SSG desde .fw/ssg primero
 * - Si no hay SSG para esa ruta, hace SSR como en dev
 */
export async function startProdServer(options: StartProdServerOptions = {}) {
  const app = express();

  // Middlewares globales de body (opcionales en prod, pero útiles para APIs)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const port = options.port ?? 3000;
  const projectRoot = options.rootDir ?? process.cwd();
  const appDir = options.appDir ?? path.resolve(projectRoot, "app");

  const httpServer = http.createServer(app);

  await runInitIfExists(projectRoot, { server: httpServer });

  // Setup de rutas y estáticos
  const { routes, apiRoutes } = setupServer(app, {
    projectRoot,
    appDir,
    isDev: false,
  });

  const ssgOutDir = path.join(projectRoot, ".fw", "ssg");

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

  // Páginas
  app.get("*", async (req, res) => {
    await handlePageRequest({
      routes,
      urlPath: req.path,
      req,
      res,
      env: "prod",
      ssgOutDir,
    });
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Prod server corriendo en http://localhost:${port}`);
    console.log(`🧭 Leyendo rutas desde: ${appDir}`);
    console.log(`📦 Cliente servido desde /static ( .fw/client )`);
    console.log(`📄 SSG servido desde .fw/ssg (si existe)`);
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
  const app = express();

  // 💡 Middlewares globales para parsear el body
  app.use(express.json()); // application/json
  app.use(express.urlencoded({ extended: true })); // forms (application/x-www-form-urlencoded)

  const port = options.port ?? 3000;

  const projectRoot = options.rootDir ?? process.cwd();
  const appDir = options.appDir ?? path.resolve(projectRoot, "app");

  const httpServer = http.createServer(app);

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
    await handlePageRequest({
      routes: currentRoutes,
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
