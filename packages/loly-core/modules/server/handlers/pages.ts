import { Request, Response } from "express";
import { renderToPipeableStream } from "react-dom/server";
import {
  ServerContext,
  LoadedRoute,
  LoaderResult,
  matchRoute,
  RewriteLoader,
  processRewrites,
  RedirectResponse,
  NotFoundResponse,
} from "@router/index";
import {
  buildAppTree,
  buildInitialData,
  createDocumentTree,
  buildRouterData,
} from "@rendering/index";
import { runRouteMiddlewares } from "./middleware";
import { runRouteServerHook } from "./server-hook";
import { handleDataResponse, handleRedirect, handleNotFound } from "./response";
import { tryServeSsgHtml, tryServeSsgData } from "./ssg";
import { ERROR_CHUNK_KEY, STATIC_PATH } from "@constants/globals";
import { getClientJsPath, getClientCssPath, loadAssetManifest, getFaviconInfo } from "@build/utils";
import { getStaticDir, type FrameworkConfig } from "@src/config";
import { sanitizeParams } from "@security/sanitize";
import { getRequestLogger } from "@logger/index";
import path from "path";
import type { PageMetadata } from "@router/index";

/**
 * Merges two PageMetadata objects.
 * The second metadata (newer) overrides the first (older).
 * For nested objects like openGraph and twitter, we do a shallow merge.
 * Arrays like metaTags and links are replaced entirely (not merged).
 * 
 * @param base - Base metadata (from layout, can be null)
 * @param override - Override metadata (from page or more specific layout, can be null)
 * @returns Combined metadata or null if both are null
 */
export function mergeMetadata(
  base: PageMetadata | null,
  override: PageMetadata | null
): PageMetadata | null {
  if (!base && !override) return null;
  if (!base) return override;
  if (!override) return base;

  return {
    // Simple fields: override wins
    title: override.title ?? base.title,
    description: override.description ?? base.description,
    lang: override.lang ?? base.lang,
    canonical: override.canonical ?? base.canonical,
    robots: override.robots ?? base.robots,
    themeColor: override.themeColor ?? base.themeColor,
    viewport: override.viewport ?? base.viewport,
    
    // Nested objects: shallow merge (override wins for each field)
    openGraph: override.openGraph
      ? {
          ...base.openGraph,
          ...override.openGraph,
          // For image, if override has image, use it entirely (don't merge)
          image: override.openGraph.image ?? base.openGraph?.image,
        }
      : base.openGraph,
    
    twitter: override.twitter
      ? {
          ...base.twitter,
          ...override.twitter,
        }
      : base.twitter,
    
    // Arrays: override replaces base entirely (not merged)
    metaTags: override.metaTags ?? base.metaTags,
    links: override.links ?? base.links,
  };
}

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
  config?: FrameworkConfig;
  rewriteLoader?: RewriteLoader;
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
 * Renders the not-found page (_not-found.tsx) with proper SSR.
 * Used both when a route doesn't match and when ctx.NotFound() is called.
 */
async function renderNotFoundPage(
  notFoundPage: LoadedRoute,
  req: Request,
  res: Response,
  urlPath: string,
  finalUrlPath: string,
  routerData: any,
  assetManifest: any,
  theme: string | undefined,
  clientJsPath: string,
  clientCssPath: string,
  faviconInfo: { path: string; type: string } | null,
  projectRoot: string | undefined,
  skipLayoutHooks: boolean,
  errorPage: LoadedRoute | null,
  routeChunks: Record<string, string> | undefined,
  env: "dev" | "prod",
  config: FrameworkConfig | undefined
): Promise<void> {
  const ctx: ServerContext & { theme?: string } = {
    req,
    res,
    params: {},
    pathname: urlPath,
    locals: {},
    Redirect: (destination: string, permanent = false) => new RedirectResponse(destination, permanent),
    NotFound: () => new NotFoundResponse(),
  };

  // Execute layout server hooks and combine props (skip if header is set)
  const layoutProps: Record<string, any> = {};
  if (!skipLayoutHooks && notFoundPage.layoutServerHooks && notFoundPage.layoutServerHooks.length > 0) {
    for (let i = 0; i < notFoundPage.layoutServerHooks.length; i++) {
      const layoutServerHook = notFoundPage.layoutServerHooks[i];
      const layoutMiddlewares = notFoundPage.layoutMiddlewares?.[i] || [];
      
      // Execute layout middlewares before layout hook
      if (layoutMiddlewares.length > 0) {
        for (const mw of layoutMiddlewares) {
          try {
            await Promise.resolve(
              mw(ctx, async () => {
                /* no-op */
              })
            );
          } catch (error) {
            const reqLogger = getRequestLogger(req);
            const layoutFile = notFoundPage.layoutFiles[i];
            const relativeLayoutPath = layoutFile
              ? path.relative(projectRoot || process.cwd(), layoutFile)
              : "unknown";
            
            reqLogger.error("Layout middleware failed for not-found page", error instanceof Error ? error : new Error(String(error)), {
              layoutIndex: i,
              layoutFile: relativeLayoutPath,
            });
            
            throw error;
          }
          
          if (ctx.res.headersSent) {
            return;
          }
        }
      }
      
      if (layoutServerHook) {
        try {
          const layoutResult = await layoutServerHook(ctx);
          
          // Check for RedirectResponse or NotFoundResponse in layout hooks
          if (layoutResult instanceof RedirectResponse) {
            handleRedirect(res, { destination: layoutResult.destination, permanent: layoutResult.permanent });
            return;
          }
          
          if (layoutResult instanceof NotFoundResponse) {
            // If not-found page itself returns NotFound, fall back to simple HTML
            handleNotFound(res, urlPath);
            return;
          }
          
          if (layoutResult.props) {
            Object.assign(layoutProps, layoutResult.props);
          }
        } catch (error) {
          // Log but continue
          const reqLogger = getRequestLogger(req);
          const layoutFile = notFoundPage.layoutFiles[i];
          const relativeLayoutPath = layoutFile
            ? path.relative(projectRoot || process.cwd(), layoutFile)
            : "unknown";
          
          reqLogger.warn("Layout server hook failed for not-found page", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            layoutFile: relativeLayoutPath,
            layoutIndex: i,
          });
        }
      }
    }
  }

  let loaderResult = await runRouteServerHook(notFoundPage, ctx);
  
  // Check for RedirectResponse or NotFoundResponse
  if (loaderResult instanceof RedirectResponse) {
    handleRedirect(res, { destination: loaderResult.destination, permanent: loaderResult.permanent });
    return;
  }
  
  if (loaderResult instanceof NotFoundResponse) {
    // If not-found page itself returns NotFound, fall back to simple HTML
    handleNotFound(res, urlPath);
    return;
  }
  
  // At this point, loaderResult is definitely a LoaderResult
  const notFoundLoaderResult = loaderResult as LoaderResult;
  
  // Automatically inject theme from server into loaderResult if not already set
  if (!notFoundLoaderResult.theme) {
    notFoundLoaderResult.theme = theme;
  }

  // Combine props: layout props + page props
  const combinedProps = {
    ...layoutProps,
    ...(notFoundLoaderResult.props || {}),
  };
  const combinedLoaderResult: LoaderResult = {
    ...notFoundLoaderResult,
    props: combinedProps,
  };

  // Use finalUrlPath (rewritten) for initialData so client can match correctly
  const initialData = buildInitialData(finalUrlPath, {}, combinedLoaderResult);
  const appTree = buildAppTree(notFoundPage, {}, initialData.props);
  initialData.notFound = true;

  // Get nonce from res.locals (set by Helmet for CSP)
  const nonce = (res.locals as any).nonce || undefined;

  // Get entrypoint files in order for preload
  const entrypointFiles: string[] = [];
  if (assetManifest?.entrypoints?.client) {
    entrypointFiles.push(...assetManifest.entrypoints.client.map((file: string) => `${STATIC_PATH}/${file}`));
  }

  const documentTree = createDocumentTree({
    appTree,
    initialData,
    routerData,
    meta: combinedLoaderResult.metadata ?? null,
    titleFallback: "Not found",
    descriptionFallback: "Loly demo",
    chunkHref: null,
    entrypointFiles,
    theme,
    clientJsPath,
    clientCssPath,
    nonce,
    faviconPath: faviconInfo?.path || null,
    faviconType: faviconInfo?.type || null,
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
      const reqLogger = getRequestLogger(req);
      reqLogger.error("SSR shell error", err, { route: "not-found" });
          if (!res.headersSent && errorPage) {
            renderErrorPageWithStream(errorPage, req, res, err, routeChunks || {}, theme, projectRoot, env, config, notFoundPage);
      } else if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<!doctype html><h1>Internal Server Error</h1>");
      }
      abort();
    },
    onError(err) {
      didError = true;
      const reqLogger = getRequestLogger(req);
      reqLogger.error("SSR error", err, { route: "not-found" });
    },
  });

  req.on("close", () => abort());
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
    const reqLogger = getRequestLogger(req);
    
    if (errorPage) {
      await renderErrorPageWithStream(errorPage, req, res, error, routeChunks || {}, theme, projectRoot, options.env, options.config, options.notFoundPage);
    } else {
      reqLogger.error("Unhandled error in page request", error, {
        urlPath: options.urlPath,
        hasErrorPage: !!errorPage,
      });
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
    config,
    rewriteLoader,
  } = options;

  // Apply rewrites BEFORE route matching
  let finalUrlPath = urlPath;
  let extractedParams: Record<string, string> = {};
  
  if (rewriteLoader) {
    try {
      const compiledRewrites = await rewriteLoader.loadRewrites();
      const rewriteResult = await processRewrites(urlPath, compiledRewrites, req);
      
      if (rewriteResult) {
        finalUrlPath = rewriteResult.rewrittenPath;
        extractedParams = rewriteResult.extractedParams;
        
        // Normalize the rewritten path (ensure proper format for matching)
        // Remove trailing slash, ensure it starts with /, remove double slashes
        finalUrlPath = finalUrlPath
          .replace(/\/+/g, "/") // Replace multiple slashes with single slash
          .replace(/^([^/])/, "/$1") // Ensure it starts with /
          .replace(/\/$/, "") || "/"; // Remove trailing slash, but keep "/" for root
        
        // Debug logging (can be removed in production)
        if (env === "dev") {
          const reqLogger = getRequestLogger(req);
          reqLogger.debug("Rewrite applied", {
            originalPath: urlPath,
            rewrittenPath: finalUrlPath,
            extractedParams,
            host: req.get("host"),
          });
        }
        
        // Inject extracted params into req.query for server hooks to access
        // Preserve existing query params
        Object.assign(req.query, extractedParams);
        
        // Also store in locals for easier access
        if (!(req as any).locals) {
          (req as any).locals = {};
        }
        Object.assign((req as any).locals, extractedParams);
      }
    } catch (error) {
      const reqLogger = getRequestLogger(req);
      reqLogger.error("Error processing rewrites", error, {
        urlPath,
        host: req.get("host"),
      });
      // Continue with original path if rewrite fails
    }
  }
  
  // Normalize finalUrlPath before matching (in case no rewrite was applied)
  finalUrlPath = finalUrlPath.replace(/\/$/, "") || "/";

  // Get asset paths - in dev, always use non-hashed names; in prod, use manifest if available
  const clientJsPath = env === "dev" 
    ? "/static/client.js" 
    : (projectRoot ? getClientJsPath(projectRoot) : "/static/client.js");
  const clientCssPath = env === "dev"
    ? "/static/client.css"
    : (projectRoot ? getClientCssPath(projectRoot) : "/static/client.css");
  const assetManifest = env === "prod" && projectRoot ? loadAssetManifest(projectRoot) : null;

  // Detect favicon
  const faviconInfo = projectRoot && config
    ? getFaviconInfo(projectRoot, config.directories.static, env === "dev")
    : null;

  const isDataReq = isDataRequest(req);
  
  // Check if client wants to skip layout hooks execution (SPA navigation optimization)
  // Only skip for data requests, never for HTML requests (initial load)
  const skipLayoutHooks = isDataReq && req.headers["x-skip-layout-hooks"] === "true";

  if (env === "prod" && ssgOutDir) {
    if (isDataReq) {
      if (tryServeSsgData(res, ssgOutDir, finalUrlPath)) {
        return;
      }
    } else {
      if (tryServeSsgHtml(res, ssgOutDir, finalUrlPath)) {
        return;
      }
    }
  }

  const matched = matchRoute(routes, finalUrlPath);

  // Debug logging for rewrites (can be removed in production)
  if (env === "dev") {
    const reqLogger = getRequestLogger(req);
    if (finalUrlPath !== urlPath) {
      reqLogger.debug("Route matching after rewrite", {
        originalPath: urlPath,
        rewrittenPath: finalUrlPath,
        matched: !!matched,
        matchedRoute: matched?.route.pattern,
        matchedParams: matched?.params,
        availableRoutes: routes.slice(0, 10).map((r) => r.pattern), // Show first 10 routes
      });
    } else if (!matched) {
      // Log when no match found
      reqLogger.debug("No route match found", {
        path: finalUrlPath,
        availableRoutes: routes.slice(0, 10).map((r) => r.pattern),
      });
    }
  }

  const routerData = buildRouterData(req);

  if (!matched) {
    // For data requests, return JSON 404 instead of HTML
    if (isDataReq) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ notFound: true, pathname: finalUrlPath }));
      return;
    }
    
    if (notFoundPage) {
      await renderNotFoundPage(
        notFoundPage,
        req,
        res,
        urlPath,
        finalUrlPath,
        routerData,
        assetManifest,
        theme,
        clientJsPath,
        clientCssPath,
        faviconInfo,
        projectRoot,
        skipLayoutHooks,
        errorPage,
        routeChunks,
        env,
        config
      );
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
    Redirect: (destination: string, permanent = false) => new RedirectResponse(destination, permanent),
    NotFound: () => new NotFoundResponse(),
  };

  await runRouteMiddlewares(route, ctx);
  if (res.headersSent) {
    return;
  }

  // 1. Execute layout server hooks (root → specific) and collect props + metadata
  // Skip layout hooks if client requested it (SPA navigation optimization)
  const layoutProps: Record<string, any> = {};
  const layoutMetadata: Array<LoaderResult["metadata"]> = [];
  const reqLogger = getRequestLogger(req);

  if (!skipLayoutHooks && route.layoutServerHooks && route.layoutServerHooks.length > 0) {
    for (let i = 0; i < route.layoutServerHooks.length; i++) {
      const layoutServerHook = route.layoutServerHooks[i];
      const layoutMiddlewares = route.layoutMiddlewares?.[i] || [];
      
      // Execute layout middlewares before layout hook
      if (layoutMiddlewares.length > 0) {
        for (const mw of layoutMiddlewares) {
          try {
            await Promise.resolve(
              mw(ctx, async () => {
                /* no-op */
              })
            );
          } catch (error) {
            const layoutFile = route.layoutFiles[i];
            const relativeLayoutPath = layoutFile
              ? path.relative(projectRoot || process.cwd(), layoutFile)
              : "unknown";
            
            reqLogger.error("Layout middleware failed", error instanceof Error ? error : new Error(String(error)), {
              route: route.pattern,
              layoutIndex: i,
              layoutFile: relativeLayoutPath,
            });
            
            // Re-throw to be handled by the route handler
            throw error;
          }
          
          // Stop executing if response was sent (e.g., redirect)
          if (ctx.res.headersSent) {
            return;
          }
        }
      }
      
      if (layoutServerHook) {
        try {
          const layoutResult = await layoutServerHook(ctx);
          
          // Check for RedirectResponse or NotFoundResponse in layout hooks
          if (layoutResult instanceof RedirectResponse) {
            if (isDataReq) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ redirect: { destination: layoutResult.destination, permanent: layoutResult.permanent } }));
            } else {
              handleRedirect(res, { destination: layoutResult.destination, permanent: layoutResult.permanent });
            }
            return;
          }
          
          if (layoutResult instanceof NotFoundResponse) {
            if (isDataReq) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ notFound: true }));
            } else {
              // Render the not-found page instead of simple HTML
              if (notFoundPage) {
                await renderNotFoundPage(
                  notFoundPage,
                  req,
                  res,
                  urlPath,
                  finalUrlPath,
                  routerData,
                  assetManifest,
                  theme,
                  clientJsPath,
                  clientCssPath,
                  faviconInfo,
                  projectRoot,
                  skipLayoutHooks,
                  errorPage,
                  routeChunks,
                  env,
                  config
                );
              } else {
                handleNotFound(res, urlPath);
              }
            }
            return;
          }
          
          // Merge props (more specific layouts override general ones)
          if (layoutResult.props) {
            Object.assign(layoutProps, layoutResult.props);
          }
          // Collect metadata from layouts (will be merged later)
          if (layoutResult.metadata) {
            layoutMetadata.push(layoutResult.metadata);
          }
        } catch (error) {
          // Log error but continue (layout server hook failure shouldn't break the page)
          const layoutFile = route.layoutFiles[i];
          const relativeLayoutPath = layoutFile
            ? path.relative(projectRoot || process.cwd(), layoutFile)
            : "unknown";
          
          reqLogger.warn("Layout server hook failed", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            layoutFile: relativeLayoutPath,
            route: route.pattern,
            layoutIndex: i,
            suggestion: "Check your layout.server.hook.ts file for errors",
          });
        }
      }
    }
  }

  // 2. Execute page server hook (getServerSideProps)
  let loaderResult: LoaderResult | RedirectResponse | NotFoundResponse;
  try {
    loaderResult = await runRouteServerHook(route, ctx);
    
    // Check for RedirectResponse or NotFoundResponse BEFORE combining props/metadata
    if (loaderResult instanceof RedirectResponse) {
      if (isDataReq) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ redirect: { destination: loaderResult.destination, permanent: loaderResult.permanent } }));
      } else {
        handleRedirect(res, { destination: loaderResult.destination, permanent: loaderResult.permanent });
      }
      return;
    }
    
    if (loaderResult instanceof NotFoundResponse) {
      if (isDataReq) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ notFound: true }));
      } else {
        // Render the not-found page instead of simple HTML
        if (notFoundPage) {
          await renderNotFoundPage(
            notFoundPage,
            req,
            res,
            urlPath,
            finalUrlPath,
            routerData,
            assetManifest,
            theme,
            clientJsPath,
            clientCssPath,
            faviconInfo,
            projectRoot,
            skipLayoutHooks,
            errorPage,
            routeChunks,
            env,
            config
          );
        } else {
          handleNotFound(res, urlPath);
        }
      }
      return;
    }
    
    // At this point, loaderResult is definitely a LoaderResult (not RedirectResponse or NotFoundResponse)
    const pageLoaderResult = loaderResult as LoaderResult;
    
    // Automatically inject theme from server into loaderResult if not already set
    if (!pageLoaderResult.theme) {
      pageLoaderResult.theme = theme;
    }
  } catch (error) {
    // Log detailed error information
    const relativePagePath = route.pageFile
      ? path.relative(projectRoot || process.cwd(), route.pageFile)
      : "unknown";
    
    reqLogger.error("Page server hook failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      pageFile: relativePagePath,
      route: route.pattern,
      pathname: urlPath,
      suggestion: "Check your page.server.hook.ts (or server.hook.ts) file for errors",
    });
    
    // If loader throws, handle error appropriately
    if (isDataReq) {
      // For data requests, return error JSON with more context
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      const errorResponse = {
        error: true,
        message: error instanceof Error ? error.message : String(error),
        route: route.pattern,
        pageFile: relativePagePath,
      };
      res.end(JSON.stringify(errorResponse, null, 2));
      return;
    } else {
      // For HTML requests, render error page
      if (errorPage) {
        await renderErrorPageWithStream(errorPage, req, res, error, routeChunks, theme, projectRoot, env, config, notFoundPage);
        return;
      } else {
        throw error; // Re-throw to be caught by outer try-catch
      }
    }
  }

  // 3. Combine props: layout props (stable) + page props (page overrides layout)
  const pageLoaderResult = loaderResult as LoaderResult; // We already checked it's not RedirectResponse/NotFoundResponse
  const combinedProps = {
    ...layoutProps, // Props from layouts (stable)
    ...(pageLoaderResult.props || {}), // Props from page (overrides layout)
  };

  // 4. Combine metadata: layout metadata (base) + page metadata (page overrides layout)
  // Layout metadata provides defaults (like site-wide Open Graph, canonical base, etc.)
  // Page metadata can override specific fields or add page-specific data
  let combinedMetadata: LoaderResult["metadata"] = null;
  
  // Start with layout metadata (most general first, then more specific)
  // Later layouts override earlier ones, then page overrides all
  for (const layoutMeta of layoutMetadata) {
    if (layoutMeta) {
      combinedMetadata = mergeMetadata(combinedMetadata, layoutMeta);
    }
  }
  
  // Finally, page metadata overrides everything
  if (pageLoaderResult.metadata) {
    combinedMetadata = mergeMetadata(combinedMetadata, pageLoaderResult.metadata);
  }

  // Use combined props and metadata in loaderResult
  // Include rewritten pathname so client can match correctly
  const combinedLoaderResult: LoaderResult = {
    ...pageLoaderResult,
    props: combinedProps,
    metadata: combinedMetadata,
    pathname: finalUrlPath, // Include rewritten pathname for client-side matching
  };

  if (isDataReq) {
    // For data requests, pass separated props:
    // - layoutProps: only if layout hooks were executed (not skipped)
    // - pageProps: always (from page.server.hook)
    const pagePropsOnly = pageLoaderResult.props || {};
    handleDataResponse(
      res,
      combinedLoaderResult,
      theme,
      skipLayoutHooks ? null : (Object.keys(layoutProps).length > 0 ? layoutProps : null),
      pagePropsOnly
    );
    return;
  }

  // Use finalUrlPath (rewritten) for initialData so client can match correctly
  // The original urlPath is preserved in the browser, but the client needs the rewritten path to match routes
  const initialData = buildInitialData(finalUrlPath, params, combinedLoaderResult);
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

  // Get entrypoint files in order (runtime, vendor, commons, entry) for preload
  const entrypointFiles: string[] = [];
  if (assetManifest?.entrypoints?.client) {
    entrypointFiles.push(...assetManifest.entrypoints.client.map(file => `${STATIC_PATH}/${file}`));
  }

  const documentTree = createDocumentTree({
    appTree,
    initialData,
    routerData,
    meta: combinedLoaderResult.metadata,
    titleFallback: "Loly framework",
    descriptionFallback: "Loly demo",
    chunkHref,
    entrypointFiles,
    theme,
    clientJsPath,
    clientCssPath,
    nonce,
    faviconPath: faviconInfo?.path || null,
    faviconType: faviconInfo?.type || null,
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
      const reqLogger = getRequestLogger(req);
      const routePattern = matched?.route?.pattern || "unknown";
      reqLogger.error("SSR shell error", err, { route: routePattern });
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ [framework][ssr] Shell error for route "${routePattern}":`);
      console.error(`   ${errorMessage}`);
      if (err instanceof Error && err.stack) {
        console.error(`   Stack: ${err.stack.split('\n').slice(0, 3).join('\n   ')}`);
      }
      console.error("💡 This usually indicates a React rendering error\n");

      if (!res.headersSent && errorPage) {
        renderErrorPageWithStream(errorPage, req, res, err, routeChunks, theme, projectRoot, env, config, notFoundPage);
      } else if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<!doctype html><h1>Internal Server Error</h1>");
      }

      abort();
    },

    onError(err) {
      didError = true;
      const reqLogger = getRequestLogger(req);
      const routePattern = matched?.route?.pattern || "unknown";
      reqLogger.error("SSR error", err, { route: routePattern });
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`⚠️  [framework][ssr] Error during streaming for route "${routePattern}":`);
      console.error(`   ${errorMessage}`);
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
  env: "dev" | "prod" = "dev",
  config?: FrameworkConfig,
  notFoundPage?: LoadedRoute | null,
): Promise<void> {
  try {
    const isDataReq = isDataRequest(req);
    // Check if client wants to skip layout hooks execution (SPA navigation optimization)
    const skipLayoutHooks = isDataReq && req.headers["x-skip-layout-hooks"] === "true";
    
    const ctx: ServerContext = {
      req,
      res,
      params: { error: String(error) },
      pathname: req.path,
      locals: { error },
      Redirect: (destination: string, permanent = false) => new RedirectResponse(destination, permanent),
      NotFound: () => new NotFoundResponse(),
    };

    // Detect favicon
    const faviconInfo = projectRoot && config
      ? getFaviconInfo(projectRoot, config.directories.static, env === "dev")
      : null;

    // Execute layout server hooks and combine props (skip if header is set)
    const layoutProps: Record<string, any> = {};
    const reqLogger = getRequestLogger(req);
    if (!skipLayoutHooks && errorPage.layoutServerHooks && errorPage.layoutServerHooks.length > 0) {
      for (let i = 0; i < errorPage.layoutServerHooks.length; i++) {
        const layoutServerHook = errorPage.layoutServerHooks[i];
        const layoutMiddlewares = errorPage.layoutMiddlewares?.[i] || [];
        
        // Execute layout middlewares before layout hook
        if (layoutMiddlewares.length > 0) {
          for (const mw of layoutMiddlewares) {
            try {
              await Promise.resolve(
                mw(ctx, async () => {
                  /* no-op */
                })
              );
            } catch (error) {
              const layoutFile = errorPage.layoutFiles[i];
              const relativeLayoutPath = layoutFile
                ? path.relative(projectRoot || process.cwd(), layoutFile)
                : "unknown";
              
              reqLogger.error("Layout middleware failed for error page", error instanceof Error ? error : new Error(String(error)), {
                layoutIndex: i,
                layoutFile: relativeLayoutPath,
              });
              
              throw error;
            }
            
            if (ctx.res.headersSent) {
              return;
            }
          }
        }
        
        if (layoutServerHook) {
          try {
            const layoutResult = await layoutServerHook(ctx);
            
            // Check for RedirectResponse or NotFoundResponse in layout hooks
            if (layoutResult instanceof RedirectResponse) {
              if (isDataReq) {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ redirect: { destination: layoutResult.destination, permanent: layoutResult.permanent } }));
              } else {
                handleRedirect(res, { destination: layoutResult.destination, permanent: layoutResult.permanent });
              }
              return;
            }
            
            if (layoutResult instanceof NotFoundResponse) {
              if (isDataReq) {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ notFound: true }));
              } else {
                // Render the not-found page instead of simple HTML
                // Access notFoundPage from outer scope - need to check if it's available
                // For error page handler, notFoundPage might not be in scope, so we need to pass it
                // Actually, for error page, we should use handleNotFound as fallback
                handleNotFound(res, req.path);
              }
              return;
            }
            
            if (layoutResult.props) {
              Object.assign(layoutProps, layoutResult.props);
            }
          } catch (err) {
            // Log but continue
            const layoutFile = errorPage.layoutFiles[i];
            const relativeLayoutPath = layoutFile
              ? path.relative(projectRoot || process.cwd(), layoutFile)
              : "unknown";
            
            reqLogger.warn("Layout server hook failed for error page", {
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
              layoutFile: relativeLayoutPath,
              layoutIndex: i,
            });
          }
        }
      }
    }

    let loaderResult = await runRouteServerHook(errorPage, ctx);
    
    // Check for RedirectResponse or NotFoundResponse
    if (loaderResult instanceof RedirectResponse) {
      if (isDataReq) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ redirect: { destination: loaderResult.destination, permanent: loaderResult.permanent } }));
      } else {
        handleRedirect(res, { destination: loaderResult.destination, permanent: loaderResult.permanent });
      }
      return;
    }
    
    if (loaderResult instanceof NotFoundResponse) {
      if (isDataReq) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ notFound: true }));
      } else {
        // Render the not-found page instead of simple HTML
        if (notFoundPage) {
          const notFoundAssetManifest = env === "prod" && projectRoot ? loadAssetManifest(projectRoot) : null;
          const notFoundClientJsPath = env === "dev" 
            ? "/static/client.js" 
            : (projectRoot ? getClientJsPath(projectRoot) : "/static/client.js");
          const notFoundClientCssPath = env === "dev"
            ? "/static/client.css"
            : (projectRoot ? getClientCssPath(projectRoot) : "/static/client.css");
          const notFoundFaviconInfo = projectRoot && config
            ? getFaviconInfo(projectRoot, config.directories.static, env === "dev")
            : null;
          
          await renderNotFoundPage(
            notFoundPage,
            req,
            res,
            req.path,
            req.path,
            buildRouterData(req),
            notFoundAssetManifest,
            theme,
            notFoundClientJsPath,
            notFoundClientCssPath,
            notFoundFaviconInfo,
            projectRoot,
            false,
            errorPage,
            routeChunks,
            env,
            config
          );
        } else {
          handleNotFound(res, req.path);
        }
      }
      return;
    }
    
    // At this point, loaderResult is definitely a LoaderResult
    const errorLoaderResult = loaderResult as LoaderResult;
    
    // Automatically inject theme from server into loaderResult if not already set
    if (!errorLoaderResult.theme && theme) {
      errorLoaderResult.theme = theme;
    }

    // Combine props: layout props + page props
    const combinedProps = {
      ...layoutProps,
      ...(errorLoaderResult.props || {}),
    };
    const combinedLoaderResult: LoaderResult = {
      ...errorLoaderResult,
      props: combinedProps,
    };

    const initialData = buildInitialData(req.path, { error: String(error) }, combinedLoaderResult);
    const routerData = buildRouterData(req);
    initialData.error = true;
    
    // If this is a data request, return JSON instead of HTML
    if (isDataReq) {
      const pagePropsOnly = errorLoaderResult.props || {};
      handleDataResponse(
        res,
        combinedLoaderResult,
        theme,
        skipLayoutHooks ? null : (Object.keys(layoutProps).length > 0 ? layoutProps : null),
        pagePropsOnly,
        true, // error flag
        String(error) // error message
      );
      return;
    }
    const appTree = buildAppTree(errorPage, { error: String(error) }, initialData.props);

    // Get asset paths with hashes (if in production and manifest exists)
    // In dev, always use non-hashed names; in prod, use manifest if available
    const clientJsPath = env === "dev"
      ? "/static/client.js"
      : (projectRoot ? getClientJsPath(projectRoot) : "/static/client.js");
    const clientCssPath = env === "dev"
      ? "/static/client.css"
      : (projectRoot ? getClientCssPath(projectRoot) : "/static/client.css");
    const assetManifest = env === "prod" && projectRoot ? loadAssetManifest(projectRoot) : null;

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

    // Get entrypoint files in order for preload
    const entrypointFiles: string[] = [];
    if (assetManifest?.entrypoints?.client) {
      entrypointFiles.push(...assetManifest.entrypoints.client.map(file => `${STATIC_PATH}/${file}`));
    }

    const documentTree = createDocumentTree({
      appTree,
      initialData,
      routerData,
      meta: combinedLoaderResult.metadata ?? null,
      titleFallback: "Error",
      descriptionFallback: "An error occurred",
      chunkHref,
      theme,
      clientJsPath,
      clientCssPath,
      nonce,
      faviconPath: faviconInfo?.path || null,
      faviconType: faviconInfo?.type || null,
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
        const reqLogger = getRequestLogger(req);
        reqLogger.error("Error rendering error page", err, { type: "shellError" });
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end("<!doctype html><h1>Internal Server Error</h1>");
        }
        abort();
      },
      onError(err) {
        didError = true;
        const reqLogger = getRequestLogger(req);
        reqLogger.error("Error in error page", err);
      },
    });

    req.on("close", () => {
      abort();
    });
  } catch (renderErr) {
    const reqLogger = getRequestLogger(req);
    reqLogger.error("Error rendering error page (catch)", renderErr, { type: "renderException" });
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<!doctype html><h1>Internal Server Error</h1>");
    }
  }
}

