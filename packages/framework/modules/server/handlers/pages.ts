import { Request, Response } from "express";
import { renderToPipeableStream } from "react-dom/server";
import {
  ServerContext,
  LoadedRoute,
  matchRoute,
} from "@router/index";
import {
  buildAppTree,
  buildInitialData,
  createDocumentTree,
} from "@rendering/index";
import { runRouteMiddlewares } from "./middleware";
import { runRouteLoader } from "./loader";
import {
  handleDataResponse,
  handleRedirect,
  handleNotFound,
} from "./response";
import { tryServeSsgHtml, tryServeSsgData } from "./ssg";

export interface HandlePageRequestOptions {
  routes: LoadedRoute[];
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

  // Log para SSR
  if (!isDataReq) {
    console.log(`[SSR]`, urlPath);
  }

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
    handleNotFound(res);
    return;
  }

  // Construir initialData + árbol de la app
  const initialData = buildInitialData(urlPath, params, loaderResult);
  const appTree = buildAppTree(route, params, initialData.props);

  // Documento HTML completo
  const documentTree = createDocumentTree({
    appTree,
    initialData,
    meta: loaderResult.metadata,
    titleFallback: "Loly framework",
    descriptionFallback: "Loly demo",
  });

  // Stream de respuesta con React 18
  const { pipe } = renderToPipeableStream(documentTree, {
    onShellReady() {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.write("<!DOCTYPE html>");
      pipe(res);
    },
    onError(err) {
      console.error(`[framework][${env}] SSR error:`, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Internal Server Error");
      }
    },
  });
}

