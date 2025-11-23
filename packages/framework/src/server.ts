import fs from "fs";
import http from "http";
import express from "express";
import React, { ReactElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import path from "path";
import {
  ApiContext,
  loadApiRoutes,
  LoaderResult,
  loadRoutes,
  matchApiRoute,
  matchRoute,
  PageComponent,
  ServerContext,
  writeClientRoutesManifest,
} from "@router/index";
import { startClientBundler } from "@build/client";
import {
  buildAppTree,
  buildInitialData,
  createDocumentTree,
} from "@rendering/index";
import { setupHotReload } from "@dev/hot-reload-client";
import { clearAppRequireCache } from "@dev/hot-reload-server";

//#region PROD
export interface StartProdServerOptions {
  port?: number;
  rootDir?: string; // raíz del proyecto de la app (ej: apps/example)
  appDir?: string; // por defecto rootDir + "/app"
}

export interface InitServerData {
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
}

function getSsgDirForPath(baseDir: string, urlPath: string) {
  const clean = urlPath === "/" ? "" : urlPath.replace(/^\/+/, "");
  return path.join(baseDir, clean);
}

function getSsgHtmlPath(baseDir: string, urlPath: string) {
  const dir = getSsgDirForPath(baseDir, urlPath);
  return path.join(dir, "index.html");
}

function getSsgDataPath(baseDir: string, urlPath: string) {
  const dir = getSsgDirForPath(baseDir, urlPath);
  return path.join(dir, "data.json");
}

export async function runInitIfExists(projectRoot: string, serverData: InitServerData ) {
  const initTS = path.join(projectRoot, "init.server.ts");

  if (!fs.existsSync(initTS)) {
    console.log("[framework] No hay init.server.ts en", projectRoot);
    return {};
  }

  console.log("[framework] Ejecutando init.server.ts...");

  // 👇 Registramos el loader de TS/TSX UNA sola vez
  require("tsx/cjs");

  const mod = require(initTS);

  if (typeof mod.init === "function") {
    const serverContext: any = { ...serverData };
    await mod.init({ serverContext });
    console.log("[framework] init.server.ts ejecutado con éxito");
    return serverContext;
  }

  console.warn(
    "[framework] init.server.ts encontrado pero sin export init({ serverContext })"
  );
  return {};
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

  const routes = loadRoutes(appDir);
  const apiRoutes = loadApiRoutes(appDir);

  const clientOutDir = path.join(projectRoot, ".fw", "client");
  const ssgOutDir = path.join(projectRoot, ".fw", "ssg");

  // /static → bundle de cliente
  app.use("/static", express.static(clientOutDir));

  // APIs igual que en dev
  app.all("/api/*", async (req, res) => {
    const urlPath = req.path;
    const matched = matchApiRoute(apiRoutes, urlPath);

    if (!matched) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const { route, params } = matched;
    const method = req.method.toUpperCase();
    const handler = route.handlers[method];

    if (!handler) {
      res.setHeader("Allow", Object.keys(route.handlers).join(", "));
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const ctx: ApiContext = {
      req,
      res,
      params,
      pathname: urlPath,
      locals: {},
    };

    try {
      const globalMws = route.middlewares ?? [];
      const perMethodMws = route.methodMiddlewares?.[method] ?? [];
      const chain = [...globalMws, ...perMethodMws];

      for (const mw of chain) {
        await Promise.resolve(mw(ctx, async () => {}));
        if (res.headersSent) return;
      }

      await handler(ctx);
    } catch (err) {
      console.error("[framework][api][prod] Error en handler:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // Páginas
  app.get("*", async (req, res) => {
    const urlPath = req.path;

    const isDataRequest =
      (req.query && (req.query as any).__fw_data === "1") ||
      req.headers["x-fw-data"] === "1";

    // 1) DATA REQUEST: intentamos responder desde SSG primero
    if (isDataRequest) {
      const ssgDataPath = getSsgDataPath(ssgOutDir, urlPath);
      if (fs.existsSync(ssgDataPath)) {
        try {
          const raw = fs.readFileSync(ssgDataPath, "utf-8");
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.status(200).end(raw);
          return;
        } catch (err) {
          console.error("[framework][prod] Error leyendo SSG data:", err);
          // seguimos a SSR fallback
        }
      }
      // fallback: mismo flujo que dev
    }

    // 2) HTML: intentamos servir SSG si existe
    const ssgHtmlPath = getSsgHtmlPath(ssgOutDir, urlPath);

    if (!isDataRequest && fs.existsSync(ssgHtmlPath)) {
      console.log("[SSG]", urlPath);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      const stream = fs.createReadStream(ssgHtmlPath, { encoding: "utf-8" });
      stream.pipe(res);
      return;
    }

    // 3) Fallback SSR (igual que dev)
    const matched = matchRoute(routes, urlPath);

    if (!matched) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        `<h1>404 - Not Found</h1><p>No se encontró ruta para ${urlPath}</p>`
      );
      return;
    }

    const { route, params } = matched;

    const ctx: ServerContext = {
      req,
      res,
      params,
      pathname: urlPath,
      locals: {},
    };

    // 4) middlewares
    for (const mw of route.middlewares) {
      await Promise.resolve(
        mw(ctx, async () => {
          /* no-op */
        })
      );
    }

    // 5) loader + metadata
    let loaderResult: LoaderResult = { props: {} };

    if (route.loader) {
      loaderResult = await route.loader(ctx);
    }

    console.log("[SSR]", urlPath);

    // 6) DATA REQUEST (fallback SSR si no hubo SSG data)
    if (isDataRequest) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");

      if (loaderResult.redirect) {
        res.statusCode = 200;
        res.end(JSON.stringify({ redirect: loaderResult.redirect }));
        return;
      }

      if (loaderResult.notFound) {
        res.statusCode = 404;
        res.end(JSON.stringify({ notFound: true }));
        return;
      }

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          props: loaderResult.props ?? {},
          metadata: loaderResult.metadata ?? null,
        })
      );
      return;
    }

    // 7) Redirect / notFound para HTML
    if (loaderResult.redirect) {
      const { destination, permanent } = loaderResult.redirect;
      res.redirect(permanent ? 301 : 302, destination);
      return;
    }

    if (loaderResult.notFound) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<h1>404 - Not Found</h1>");
      return;
    }

    // 8) Construir initialData + árbol de la app
    const initialData = buildInitialData(urlPath, params, loaderResult);
    const appTree = buildAppTree(route, params, initialData.props);

    // 9) Documento HTML completo (head + body + __FW_DATA__)
    const documentTree = createDocumentTree({
      appTree,
      initialData,
      meta: loaderResult.metadata,
      titleFallback: "My Framework Dev",
      descriptionFallback: "Demo con @tuorg/framework",
    });

    // 10) Stream de respuesta con React 18 (mismo que dev/SSR normal)
    const { pipe } = renderToPipeableStream(documentTree, {
      onShellReady() {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.write("<!DOCTYPE html>");
        pipe(res);
      },
      onError(err) {
        console.error("[framework][prod] SSR error:", err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("Internal Server Error");
        }
      },
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

  setupHotReload({ app, appDir });

  const httpServer = http.createServer(app);

  await runInitIfExists(projectRoot, { server: httpServer });

  // En dev vamos a recalcular rutas en cada request
  function getRoutes() {
    // limpiar require cache solo de la app
    clearAppRequireCache(appDir);
    return {
      routes: loadRoutes(appDir),
      apiRoutes: loadApiRoutes(appDir),
    };
  }

  const { routes: manifestRoutes } = getRoutes();

  writeClientRoutesManifest(manifestRoutes, projectRoot);

  // 🔥 Bundler de cliente (Rspack) y estáticos
  const { outDir } = startClientBundler(projectRoot);
  app.use("/static", express.static(outDir));

  app.all("/api/*", async (req, res) => {
    const urlPath = req.path; // ej: /api/posts/123
    const { apiRoutes } = getRoutes();
    const matched = matchApiRoute(apiRoutes, urlPath);

    if (!matched) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const { route, params } = matched;
    const method = req.method.toUpperCase();
    const handler = route.handlers[method];

    if (!handler) {
      res.setHeader("Allow", Object.keys(route.handlers).join(", "));
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const ctx: ApiContext = {
      req,
      res,
      params,
      pathname: urlPath,
      locals: {},
    };

    try {
      // 1) Middlewares globales de la ruta (beforeApi)
      const globalMws = route.middlewares ?? [];

      // 2) Middlewares específicos del método (beforeGET, beforePOST, etc.)
      const perMethodMws = route.methodMiddlewares?.[method] ?? [];

      const chain = [...globalMws, ...perMethodMws];

      for (const mw of chain) {
        await Promise.resolve(mw(ctx, async () => {}));
        if (res.headersSent) {
          // algún middleware ya respondió; no seguimos
          return;
        }
      }

      // 3) Handler final
      await handler(ctx);
    } catch (err) {
      console.error("[framework][api] Error en handler:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  app.get("*", async (req, res) => {
    const urlPath = req.path;

    const { routes } = getRoutes();

    const matched = matchRoute(routes, urlPath);

    if (!matched) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        `<h1>404 - Not Found</h1><p>No se encontró ruta para ${urlPath}</p>`
      );
      return;
    }

    const { route, params } = matched;
    const Page = route.component;

    const isDataRequest =
      (req.query && req.query.__fw_data === "1") ||
      req.headers["x-fw-data"] === "1";

    const ctx: ServerContext = {
      req,
      res,
      params,
      pathname: urlPath,
      locals: {},
    };

    // 1) Ejecutar middlewares en cadena
    for (const mw of route.middlewares) {
      let nextCalled = false;
      await Promise.resolve(
        mw(ctx, async () => {
          nextCalled = true;
        })
      );
      // si querés podés requerir que llamen next(), o simplemente seguir
    }

    // 2) Ejecutar loader si existe
    let loaderResult: LoaderResult = { props: {} };

    // 1) Ejecutar loader
    if (route.loader) {
      loaderResult = await route.loader(ctx);
    }

    // 🔹 DATA REQUEST: devolvemos JSON y terminamos
    if (isDataRequest) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");

      if (loaderResult.redirect) {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            redirect: loaderResult.redirect,
          })
        );
        return;
      }

      if (loaderResult.notFound) {
        res.statusCode = 404;
        res.end(JSON.stringify({ notFound: true }));
        return;
      }

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          props: loaderResult.props ?? {},
          metadata: loaderResult.metadata ?? null,
        })
      );
      return;
    }

    // 3) Manejar redirect / notFound
    if (loaderResult.redirect) {
      const { destination, permanent } = loaderResult.redirect;
      res.redirect(permanent ? 301 : 302, destination);
      return;
    }

    if (loaderResult.notFound) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<h1>404 - Not Found</h1>");
      return;
    }

    const props = loaderResult.props ?? {};

    // ⭐ NUEVO: metadata para SSR
    const meta = loaderResult.metadata ?? {};
    const title = meta.title ?? "My Framework Dev";
    const description = meta.description ?? "Demo con @tuorg/framework";

    const extraMetaTags: ReactElement[] = [];

    if (description) {
      extraMetaTags.push(
        React.createElement("meta", {
          name: "description",
          content: description,
        })
      );
    }

    // Si más adelante agregás metaTags extra:
    if (Array.isArray((meta as any).metaTags)) {
      for (const tag of (meta as any).metaTags) {
        extraMetaTags.push(
          React.createElement("meta", {
            name: tag.name,
            property: tag.property,
            content: tag.content,
          })
        );
      }
    }

    // 4) Árbol de la app: Page + layouts (RootLayout afuera del todo)
    let appTree: ReactElement = React.createElement(Page as PageComponent, {
      params,
      ...props,
    });

    const layoutChain = route.layouts.slice().reverse(); // más específico → root al final

    for (const Layout of layoutChain) {
      appTree = React.createElement(Layout as PageComponent, {
        params,
        ...props,
        children: appTree,
      });
    }

    const serialized = JSON.stringify({
      pathname: urlPath,
      params,
      props,
      metadata: loaderResult.metadata ?? null,
    });

    // 2) Documento HTML completo con div#__app como root React
    const documentTree = React.createElement(
      "html",
      { lang: "es" },

      // Element
      React.createElement(
        "head",
        null,
        React.createElement("meta", { charSet: "utf-8" }),
        React.createElement(
          "title",
          null,
          title // ⭐ dinámico desde metadata
        ),
        React.createElement("meta", {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        }),

        // ⭐ meta description + extras
        ...extraMetaTags,

        React.createElement("link", {
          rel: "icon",
          href: "/static/favicon.png",
          type: "image/png",
        }),

        React.createElement("link", {
          rel: "stylesheet",
          href: "/static/client.css",
        }),

        // Script del cliente generado por Rspack
        React.createElement("script", {
          src: "/static/client.js",
          defer: true,
        })
      ),

      // Body
      React.createElement(
        "body",
        { style: { margin: 0 } },
        React.createElement("div", { id: "__app" }, appTree)
      ),

      // 💡 HIDRATACIÓN
      React.createElement("script", {
        dangerouslySetInnerHTML: {
          __html: `window.__FW_DATA__ = ${serialized};`,
        },
      })
    );

    const { pipe } = renderToPipeableStream(documentTree, {
      onShellReady() {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.write("<!DOCTYPE html>");
        pipe(res);
      },
      onError(err) {
        console.error("SSR error:", err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("Internal Server Error");
        }
      },
    });
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Dev server corriendo en http://localhost:${port}`);
    console.log(`🧭 Leyendo rutas desde: ${appDir}`);
    console.log(`📦 Cliente servido desde /static/client.js`);
  });
}
