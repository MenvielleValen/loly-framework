import { Request, Response } from "express";
import { ApiContext, ApiRoute, matchApiRoute } from "@router/index";
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
  const { apiRoutes, urlPath, req, res, env = "dev" } = options;

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

  // Security: Sanitize route parameters and query parameters
  const sanitizedParams = sanitizeParams(params);
  const sanitizedQuery = sanitizeQuery(req.query as Record<string, any>);

  const ctx: ApiContext = {
    req,
    res,
    Response: (body: any = {}, status = 200) => res.status(status).json(body),
    NotFound: (body: any = {}) => res.status(404).json(body),
    params: sanitizedParams,
    pathname: urlPath,
    locals: {},
  };

  // Update req.query with sanitized values
  req.query = sanitizedQuery as any;

  try {
    // Auto-apply rate limiting if route matches strict patterns and doesn't already have one
    const autoRateLimiter = getAutoRateLimiter(
      route,
      options.strictRateLimitPatterns
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
