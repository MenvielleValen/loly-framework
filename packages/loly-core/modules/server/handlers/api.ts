import { Request, Response } from "express";
import { ApiContext, ApiRoute, matchApiRoute, RewriteLoader, processRewrites } from "@router/index";
import { sanitizeParams, sanitizeQuery } from "@security/sanitize";
import { getAutoRateLimiter } from "@server/middleware/auto-rate-limit";
import { getRequestLogger, createModuleLogger } from "@logger/index";

export interface HandleApiRequestOptions {
  apiRoutes: ApiRoute[];
  urlPath: string;
  req: Request;
  res: Response;
  env?: "dev" | "prod";
  strictRateLimitPatterns?: string[];
  rateLimitConfig?: { windowMs?: number; strictMax?: number };
  rewriteLoader?: RewriteLoader;
}

/**
 * Handles an API route request.
 * Unifies logic between dev and prod.
 *
 * @param options - Request handling options
 */
export async function handleApiRequest(
  options: HandleApiRequestOptions
): Promise<void> {
  const { apiRoutes, urlPath, req, res, env = "dev", rewriteLoader } = options;

  // Preserve original URL path before rewrites for req.originalUrl reconstruction
  const originalUrlPath = urlPath;

  // Apply rewrites BEFORE route matching
  // NOTE: API routes CAN be rewritten (like Next.js)
  // If rewritten route starts with /api/, it will still be handled as an API route
  // If rewritten route doesn't start with /api/, it won't match here (will be handled by page routes)
  let finalUrlPath = urlPath;
  let extractedParams: Record<string, string> = {};
  
  if (rewriteLoader) {
    try {
      const compiledRewrites = await rewriteLoader.loadRewrites();
      const rewriteResult = await processRewrites(urlPath, compiledRewrites, req);
      
      if (rewriteResult) {
        finalUrlPath = rewriteResult.rewrittenPath;
        extractedParams = rewriteResult.extractedParams;
        
        // Inject extracted params into req.query for handlers to access
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
      });
      // Continue with original path if rewrite fails
    }
  }
  
  // Normalize finalUrlPath before matching
  finalUrlPath = finalUrlPath.replace(/\/$/, "") || "/";

  const matched = matchApiRoute(apiRoutes, finalUrlPath);

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

  // Security: Sanitize route parameters and query parameters
  const sanitizedParams = sanitizeParams(params);
  const sanitizedQuery = sanitizeQuery(req.query as Record<string, any>);

  /**
   * Reconstructs the full path from route pattern and captured parameters.
   * Preserves hyphens and special characters correctly.
   */
  function reconstructPathFromParams(
    routePattern: string,
    params: Record<string, string>
  ): string {
    let reconstructed = routePattern;
    
    // Reemplazar parámetros dinámicos [param] con sus valores
    // IMPORTANTE: Reemplazar catch-all PRIMERO para evitar conflictos
    for (const [key, value] of Object.entries(params)) {
      // Para catch-all [...param], reemplazar con el valor completo
      // El valor puede contener guiones, slashes, etc.
      const catchAllPattern = `[...${key}]`;
      if (reconstructed.includes(catchAllPattern)) {
        reconstructed = reconstructed.replace(catchAllPattern, value);
      } else {
        // Para parámetros normales [param]
        const normalPattern = `[${key}]`;
        if (reconstructed.includes(normalPattern)) {
          // Para parámetros normales, el valor no debería contener slashes
          reconstructed = reconstructed.replace(normalPattern, value);
        }
      }
    }
    
    return reconstructed;
  }

  // Reconstruir path completo desde parámetros (especialmente para catch-all)
  // Los parámetros capturados corresponden al pattern de la ruta, así que reconstruimos desde ahí
  const reconstructedPath = reconstructPathFromParams(route.pattern, sanitizedParams);

  // Construir originalUrl con query string si existe
  const queryString = req.url?.includes("?") ? req.url.split("?")[1] : "";
  const originalUrl = queryString 
    ? `${reconstructedPath}?${queryString}` 
    : reconstructedPath;

  // Establecer req.originalUrl si no está ya establecido
  if (!req.originalUrl) {
    req.originalUrl = originalUrl;
  }

  // Establecer req.params para compatibilidad con Express
  // Convertir params a formato que Express espera
  if (!req.params) {
    req.params = {};
  }
  for (const [key, value] of Object.entries(sanitizedParams)) {
    // Para catch-all, Express puede esperar un array o string
    // Mejor usar string que es más compatible
    req.params[key] = value;
  }

  const ctx: ApiContext = {
    req,
    res,
    Response: (body: any = {}, status = 200) => res.status(status).json(body),
    NotFound: (body: any = {}) => res.status(404).json(body),
    params: sanitizedParams,
    pathname: finalUrlPath, // Use rewritten path
    locals: {},
  };
  
  // Merge extracted params from rewrites into locals
  if (extractedParams && Object.keys(extractedParams).length > 0) {
    Object.assign(ctx.locals, extractedParams);
  }

  // Update req.query with sanitized values
  req.query = sanitizedQuery as any;

  try {
    // Auto-apply rate limiting if route matches strict patterns and doesn't already have one
    const autoRateLimiter = getAutoRateLimiter(
      route,
      options.strictRateLimitPatterns,
      options.rateLimitConfig
    );
    
    const reqLogger = getRequestLogger(req);
    
    if (autoRateLimiter) {
      reqLogger.debug("Auto rate limiter applied", {
        route: route.pattern,
        patterns: options.strictRateLimitPatterns,
      });
    }

    const globalMws = route.middlewares ?? [];
    const perMethodMws = route.methodMiddlewares?.[method] ?? [];
    
    // Prepend auto rate limiter if applicable
    const chain = autoRateLimiter 
      ? [autoRateLimiter, ...globalMws, ...perMethodMws]
      : [...globalMws, ...perMethodMws];

    for (let i = 0; i < chain.length; i++) {
      const mw = chain[i];
      
      // Validate middleware is a function
      if (typeof mw !== 'function') {
        reqLogger.warn("Invalid middleware in chain", {
          route: route.pattern,
          method,
          middlewareIndex: i,
          middlewareType: typeof mw,
        });
        continue;
      }
      
      try {
        // Check if this is an express-rate-limit middleware (expects req, res, next)
        // express-rate-limit middlewares have specific properties
        const isExpressRateLimit = 
          (mw as any).skip || (mw as any).resetKey || mw.name?.includes('rateLimit');
        
        if (isExpressRateLimit) {
          // Call express-rate-limit middleware with (req, res, next)
          await new Promise<void>((resolve, reject) => {
            const next = (err?: any) => {
              if (err) reject(err);
              else resolve();
            };
            try {
              const result = mw(req, res, next);
              // If it returns a promise, wait for it
              if (result && typeof result.then === 'function') {
                result.then(() => resolve()).catch(reject);
              }
            } catch (err) {
              reject(err);
            }
          });
        } else {
          // Call framework middleware with (ctx, next)
          await Promise.resolve(mw(ctx, async () => {}));
        }
      } catch (error) {
        reqLogger.error("API middleware failed", error instanceof Error ? error : new Error(String(error)), {
          route: route.pattern,
          method,
          middlewareIndex: i,
          middlewareName: mw.name || 'anonymous',
        });
        
        // Re-throw to be handled by error handler
        throw error;
      }
      
      if (res.headersSent) {
        return;
      }
    }

    await handler(ctx);
  } catch (err) {
    const reqLogger = getRequestLogger(req);
    reqLogger.error("API handler error", err, {
      route: route.pattern,
      method,
      env,
    });
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
