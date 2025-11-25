import { Request, Response } from "express";
import { renderToPipeableStream } from "react-dom/server";
import {
  ServerContext,
  LoadedRoute,
  matchRoute,
  loadChunksFromManifest,
} from "@router/index";
import {
  buildAppTree,
  buildInitialData,
  createDocumentTree,
} from "@rendering/index";
import { runRouteMiddlewares } from "./middleware";
import { runRouteLoader } from "./loader";
import { handleDataResponse, handleRedirect, handleNotFound } from "./response";
import { tryServeSsgHtml, tryServeSsgData } from "./ssg";

export interface HandlePageRequestOptions {
  routes: LoadedRoute[];
  routeChunks: any; // @TODO typo
  urlPath: string;
  req: Request;
  res: Response;
  env?: "dev" | "prod";
  ssgOutDir?: string; // Solo para prod
}

/**
 * Determina si una request es una data request (JSON).
 */
export function isDataRequest(req: Request): boolean {
  return (
    (req.query && (req.query as any).__fw_data === "1") ||
    req.headers["x-fw-data"] === "1"
  );
}

/**
 * Maneja una petición a una ruta de página.
 * Unifica la lógica entre dev y prod (con soporte para SSG en prod).
 */
export async function handlePageRequest(
  options: HandlePageRequestOptions
): Promise<void> {
  const {
    routes,
    routeChunks,
    urlPath,
    req,
    res,
    env = "dev",
    ssgOutDir,
  } = options;

  const isDataReq = isDataRequest(req);

  // En prod, intentar servir SSG primero
  if (env === "prod" && ssgOutDir) {
    if (isDataReq) {
      if (tryServeSsgData(res, ssgOutDir, urlPath)) {
        return;
      }
      // Si no hay SSG data, continuar con SSR fallback
    } else {
      if (tryServeSsgHtml(res, ssgOutDir, urlPath)) {
        return;
      }
      // Si no hay SSG HTML, continuar con SSR fallback
    }
  }

  // Match de ruta
  const matched = matchRoute(routes, urlPath);

  if (!matched) {
    handleNotFound(res, urlPath);
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

  // Ejecutar middlewares
  await runRouteMiddlewares(route, ctx);
  if (res.headersSent) {
    return;
  }

  // Ejecutar loader
  const loaderResult = await runRouteLoader(route, ctx);

  // Manejar data request
  if (isDataReq) {
    handleDataResponse(res, loaderResult);
    return;
  }

  // Manejar redirect / notFound para HTML
  if (loaderResult.redirect) {
    handleRedirect(res, loaderResult.redirect);
    return;
  }

  if (loaderResult.notFound) {
    if (isDataReq) {
      res.status(200).json({ notFound: true });
    } else {
      handleNotFound(res, urlPath);
    }
    return;
  }

  // Construir initialData + árbol de la app
  const initialData = buildInitialData(urlPath, params, loaderResult);
  const appTree = buildAppTree(route, params, initialData.props);

  const chunkName = routeChunks[route.pattern];
  const chunkHref = chunkName != null ? `/static/${chunkName}.js` : null;

  // Documento HTML completo
  const documentTree = createDocumentTree({
    appTree,
    initialData,
    meta: loaderResult.metadata,
    titleFallback: "Loly framework",
    descriptionFallback: "Loly demo",
    chunkHref,
  });

  // Stream de respuesta con React 18
  let didError = false;

  const { pipe, abort } = renderToPipeableStream(documentTree, {
    onShellReady() {
      if (didError || res.headersSent) {
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      pipe(res);
    },

    onShellError(err) {
      didError = true;
      console.error("[framework][prod] SSR shell error:", err);

      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<!doctype html><h1>Internal Server Error</h1>");
      }

      abort(); // 👉 muy importante: cortamos el stream de React
    },

    onError(err) {
      didError = true;
      console.error("[framework][prod] SSR error:", err);
    },
  });

  req.on("close", () => {
    abort();
  });
}
