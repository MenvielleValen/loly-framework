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
} from "./router";
import { startClientBundler } from "./build/client";

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
export function startDevServer(options: StartDevServerOptions = {}) {
  const app = express();

  // 💡 Middlewares globales para parsear el body
  app.use(express.json()); // application/json
  app.use(express.urlencoded({ extended: true })); // forms (application/x-www-form-urlencoded)

  const port = options.port ?? 3000;

  const projectRoot = options.rootDir ?? process.cwd();
  const appDir = options.appDir ?? path.resolve(projectRoot, "app");

  const routes = loadRoutes(appDir);
  const apiRoutes = loadApiRoutes(appDir);

  writeClientRoutesManifest(routes, projectRoot);

  // 🔥 Bundler de cliente (Rspack) y estáticos
  const { outDir } = startClientBundler(projectRoot);
  app.use("/static", express.static(outDir));

  app.all("/api/*", async (req, res) => {
    const urlPath = req.path; // ej: /api/posts/123
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
        React.createElement("title", null, "My Framework Dev"),
        React.createElement("meta", {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
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

  app.listen(port, () => {
    console.log(`🚀 Dev server corriendo en http://localhost:${port}`);
    console.log(`🧭 Leyendo rutas desde: ${appDir}`);
    console.log(`📦 Cliente servido desde /static/client.js`);
  });
}
