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
  notFoundPage: LoadedRoute | null;
  routeChunks: Record<string, string>;
  urlPath: string;
  req: Request;
  res: Response;
  env?: "dev" | "prod";
  ssgOutDir?: string;
}

/**
 * Determines if a request is a data request (JSON).
 *
 * @param req - Express request object
 * @returns True if the request is a data request
 */
export function isDataRequest(req: Request): boolean {
  return (
    (req.query && (req.query as any).__fw_data === "1") ||
    req.headers["x-fw-data"] === "1"
  );
}

/**
 * Handles a page route request.
 * Unifies logic between dev and prod (with SSG support in prod).
 *
 * @param options - Request handling options
 */
export async function handlePageRequest(
  options: HandlePageRequestOptions
): Promise<void> {
  const {
    routes,
    notFoundPage,
    routeChunks,
    urlPath,
    req,
    res,
    env = "dev",
    ssgOutDir,
  } = options;

  const isDataReq = isDataRequest(req);

  if (env === "prod" && ssgOutDir) {
    if (isDataReq) {
      if (tryServeSsgData(res, ssgOutDir, urlPath)) {
        return;
      }
    } else {
      if (tryServeSsgHtml(res, ssgOutDir, urlPath)) {
        return;
      }
    }
  }

  const matched = matchRoute(routes, urlPath);

  if (!matched) {
    if (notFoundPage) {
      const ctx: ServerContext = {
        req,
        res,
        params: {},
        pathname: urlPath,
        locals: {},
      };

      const loaderResult = await runRouteLoader(notFoundPage, ctx);

      const initialData = buildInitialData(urlPath, {}, loaderResult);
      const appTree = buildAppTree(notFoundPage, {}, initialData.props);
      initialData.notFound = true;
    
      const documentTree = createDocumentTree({
        appTree,
        initialData,
        meta: loaderResult.metadata ?? null,
        titleFallback: "Not found",
        descriptionFallback: "Loly demo",
        chunkHref: null,
      });
    
      let didError = false;
    
      const { pipe, abort } = renderToPipeableStream(documentTree, {
        onShellReady() {
          if (didError || res.headersSent) return;

          res.statusCode = 404;
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
          abort();
        },
        onError(err) {
          didError = true;
          console.error("[framework][prod] SSR error:", err);
        },
      });
    
      req.on("close", () => abort());
      return;
    }

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

  await runRouteMiddlewares(route, ctx);
  if (res.headersSent) {
    return;
  }

  const loaderResult = await runRouteLoader(route, ctx);

  if (isDataReq) {
    handleDataResponse(res, loaderResult);
    return;
  }

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

  const initialData = buildInitialData(urlPath, params, loaderResult);
  const appTree = buildAppTree(route, params, initialData.props);

  const chunkName = routeChunks[route.pattern];
  const chunkHref = chunkName != null ? `/static/${chunkName}.js` : null;

  const documentTree = createDocumentTree({
    appTree,
    initialData,
    meta: loaderResult.metadata,
    titleFallback: "Loly framework",
    descriptionFallback: "Loly demo",
    chunkHref,
  });

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

      abort();
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
