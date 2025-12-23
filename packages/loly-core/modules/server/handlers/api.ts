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

  const originalUrlPath = urlPath;
  let finalUrlPath = urlPath;
  let extractedParams: Record<string, string> = {};
  
  if (rewriteLoader) {
    try {
      const compiledRewrites = await rewriteLoader.loadRewrites();
      const rewriteResult = await processRewrites(urlPath, compiledRewrites, req);
      
      if (rewriteResult) {
        finalUrlPath = rewriteResult.rewrittenPath;
        extractedParams = rewriteResult.extractedParams;
        Object.assign(req.query, extractedParams);
        
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
    }
  }
  
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

  const sanitizedParams = sanitizeParams(params);
  const sanitizedQuery = sanitizeQuery(req.query as Record<string, any>);

  function reconstructPathFromParams(
    routePattern: string,
    params: Record<string, string>
  ): string {
    let reconstructed = routePattern;
    
    for (const [key, value] of Object.entries(params)) {
      const catchAllPattern = `[...${key}]`;
      if (reconstructed.includes(catchAllPattern)) {
        reconstructed = reconstructed.replace(catchAllPattern, value);
      } else {
        const normalPattern = `[${key}]`;
        if (reconstructed.includes(normalPattern)) {
          reconstructed = reconstructed.replace(normalPattern, value);
        }
      }
    }
    
    return reconstructed;
  }

  const reconstructedPath = reconstructPathFromParams(route.pattern, sanitizedParams);
  const queryString = req.url?.includes("?") ? req.url.split("?")[1] : "";
  const originalUrl = queryString 
    ? `${reconstructedPath}?${queryString}` 
    : reconstructedPath;

  if (!req.originalUrl) {
    req.originalUrl = originalUrl;
  }

  if (!req.params) {
    req.params = {};
  }
  for (const [key, value] of Object.entries(sanitizedParams)) {
    req.params[key] = value;
  }

  const ctx: ApiContext = {
    req,
    res,
    Response: (body: any = {}, status = 200) => res.status(status).json(body),
    NotFound: (body: any = {}) => res.status(404).json(body),
    params: sanitizedParams,
    pathname: finalUrlPath,
    locals: {},
  };
  
  if (extractedParams && Object.keys(extractedParams).length > 0) {
    Object.assign(ctx.locals, extractedParams);
  }

  req.query = sanitizedQuery as any;

  try {
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
    const chain = autoRateLimiter 
      ? [autoRateLimiter, ...globalMws, ...perMethodMws]
      : [...globalMws, ...perMethodMws];

    for (let i = 0; i < chain.length; i++) {
      const mw = chain[i];
      
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
        const isExpressRateLimit = 
          (mw as any).skip || (mw as any).resetKey || mw.name?.includes('rateLimit');
        
        if (isExpressRateLimit) {
          await new Promise<void>((resolve, reject) => {
            const next = (err?: any) => {
              if (err) reject(err);
              else resolve();
            };
            try {
              const result = mw(req, res, next);
              if (result && typeof result.then === 'function') {
                result.then(() => resolve()).catch(reject);
              }
            } catch (err) {
              reject(err);
            }
          });
        } else {
          await Promise.resolve(mw(ctx, async () => {}));
        }
      } catch (error) {
        reqLogger.error("API middleware failed", error instanceof Error ? error : new Error(String(error)), {
          route: route.pattern,
          method,
          middlewareIndex: i,
          middlewareName: mw.name || 'anonymous',
        });
        
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
