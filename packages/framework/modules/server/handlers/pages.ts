import { Request, Response } from "express";
import { renderToPipeableStream } from "react-dom/server";
import {
  ServerContext,
  LoadedRoute,
  LoaderResult,
  matchRoute,
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
import { ERROR_CHUNK_KEY, STATIC_PATH } from "@constants/globals";
import { getClientJsPath, getClientCssPath, loadAssetManifest } from "@build/utils";
import { sanitizeParams } from "@security/sanitize";

export interface HandlePageRequestOptions {
  routes: LoadedRoute[];
  notFoundPage: LoadedRoute | null;
  errorPage: LoadedRoute | null;
  routeChunks: Record<string, string>;
  urlPath: string;
  req: Request;
  res: Response;
  env?: "dev" | "prod";
  ssgOutDir?: string;
  theme?: string;
  projectRoot?: string;
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
  try {
    await handlePageRequestInternal(options);
  } catch (error) {
    const { errorPage, req, res, routeChunks, theme, projectRoot } = options;
    if (errorPage) {
      await renderErrorPageWithStream(errorPage, req, res, error, routeChunks || {}, theme, projectRoot);
    } else {
      console.error("[framework] Unhandled error:", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<!doctype html><h1>Internal Server Error</h1>");
      }
    }
  }
}

async function handlePageRequestInternal(
  options: HandlePageRequestOptions
): Promise<void> {
  const {
    routes,
    notFoundPage,
    errorPage,
    routeChunks,
    urlPath,
    req,
    res,
    env = "dev",
    ssgOutDir,
    theme,
    projectRoot,
  } = options;

  // Get asset paths with hashes (if in production and manifest exists)
  const clientJsPath = projectRoot ? getClientJsPath(projectRoot) : "/static/client.js";
  const clientCssPath = projectRoot ? getClientCssPath(projectRoot) : "/static/client.css";
  const assetManifest = projectRoot ? loadAssetManifest(projectRoot) : null;

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
      const ctx: ServerContext & { theme?: string } = {
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
    
      // Get nonce from res.locals (set by Helmet for CSP)
      const nonce = (res.locals as any).nonce || undefined;

      const documentTree = createDocumentTree({
        appTree,
        initialData,
        meta: loaderResult.metadata ?? null,
        titleFallback: "Not found",
        descriptionFallback: "Loly demo",
        chunkHref: null,
        theme,
        clientJsPath,
        clientCssPath,
        nonce,
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
          if (!res.headersSent && errorPage) {
            renderErrorPageWithStream(errorPage, req, res, err, routeChunks);
          } else if (!res.headersSent) {
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

  // Security: Sanitize route parameters
  const sanitizedParams = sanitizeParams(params);

  const ctx: ServerContext = {
    req,
    res,
    params: sanitizedParams,
    pathname: urlPath,
    locals: {},
  };

  await runRouteMiddlewares(route, ctx);
  if (res.headersSent) {
    return;
  }

  let loaderResult: LoaderResult;
  try {
    loaderResult = await runRouteLoader(route, ctx);
  } catch (error) {
    // If loader throws, handle error appropriately
    if (isDataReq) {
      // For data requests, return error JSON
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: true, message: String(error) }));
      return;
    } else {
      // For HTML requests, render error page
      if (errorPage) {
        await renderErrorPageWithStream(errorPage, req, res, error, routeChunks, theme, projectRoot);
        return;
      } else {
        throw error; // Re-throw to be caught by outer try-catch
      }
    }
  }

  if (isDataReq) {
    handleDataResponse(res, loaderResult, theme);
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

  // Get chunk href with hash if available
  const chunkName = routeChunks[route.pattern];
  let chunkHref: string | null = null;
  if (chunkName != null) {
    if (assetManifest && assetManifest.chunks[chunkName]) {
      // Use hashed filename from manifest
      chunkHref = `${STATIC_PATH}/${assetManifest.chunks[chunkName]}`;
    } else {
      // Fallback to non-hashed filename
      chunkHref = `${STATIC_PATH}/${chunkName}.js`;
    }
  }

  // Get nonce from res.locals (set by Helmet for CSP)
  const nonce = (res.locals as any).nonce || undefined;

  const documentTree = createDocumentTree({
    appTree,
    initialData,
    meta: loaderResult.metadata,
    titleFallback: "Loly framework",
    descriptionFallback: "Loly demo",
    chunkHref,
    theme,
    clientJsPath,
    clientCssPath,
    nonce,
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

      if (!res.headersSent && errorPage) {
        renderErrorPageWithStream(errorPage, req, res, err, routeChunks, theme, projectRoot);
      } else if (!res.headersSent) {
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

/**
 * Renders the error page when an error occurs using streaming.
 *
 * @param errorPage - Error page route
 * @param req - Express request
 * @param res - Express response
 * @param error - Error that occurred
 * @param routeChunks - Route chunks mapping
 */
async function renderErrorPageWithStream(
  errorPage: LoadedRoute,
  req: Request,
  res: Response,
  error: unknown,
  routeChunks: Record<string, string>,
  theme?: string,
  projectRoot?: string,
): Promise<void> {
  try {
    const ctx: ServerContext = {
      req,
      res,
      params: { error: String(error) },
      pathname: req.path,
      locals: { error },
    };

    const loaderResult = await runRouteLoader(errorPage, ctx);

    const initialData = buildInitialData(req.path, { error: String(error) }, loaderResult);
    initialData.error = true;
    const appTree = buildAppTree(errorPage, { error: String(error) }, initialData.props);

    // Get asset paths with hashes (if in production and manifest exists)
    const clientJsPath = projectRoot ? getClientJsPath(projectRoot) : "/static/client.js";
    const clientCssPath = projectRoot ? getClientCssPath(projectRoot) : "/static/client.css";
    const assetManifest = projectRoot ? loadAssetManifest(projectRoot) : null;

    const chunkName = routeChunks[ERROR_CHUNK_KEY];
    let chunkHref: string | null = null;
    if (chunkName != null) {
      if (assetManifest && assetManifest.chunks[chunkName]) {
        chunkHref = `${STATIC_PATH}/${assetManifest.chunks[chunkName]}`;
      } else {
        chunkHref = `${STATIC_PATH}/${chunkName}.js`;
      }
    }

    // Get nonce from res.locals (set by Helmet for CSP)
    const nonce = (res.locals as any).nonce || undefined;

    const documentTree = createDocumentTree({
      appTree,
      initialData,
      meta: loaderResult.metadata ?? null,
      titleFallback: "Error",
      descriptionFallback: "An error occurred",
      chunkHref,
      theme,
      clientJsPath,
      clientCssPath,
      nonce,
    });

    let didError = false;

    const { pipe, abort } = renderToPipeableStream(documentTree, {
      onShellReady() {
        if (didError || res.headersSent) {
          return;
        }

        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        pipe(res);
      },
      onShellError(err) {
        didError = true;
        console.error("[framework] Error rendering error page:", err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end("<!doctype html><h1>Internal Server Error</h1>");
        }
        abort();
      },
      onError(err) {
        didError = true;
        console.error("[framework] Error in error page:", err);
      },
    });

    req.on("close", () => {
      abort();
    });
  } catch (renderErr) {
    console.error("[framework] Error rendering error page:", renderErr);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<!doctype html><h1>Internal Server Error</h1>");
    }
  }
}

