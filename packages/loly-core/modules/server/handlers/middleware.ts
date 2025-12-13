import { ServerContext, LoadedRoute } from "@router/index";
import path from "path";
import { getRequestLogger } from "@logger/index";

/**
 * Executes route middlewares in chain.
 * 
 * If a middleware throws an error, it's logged and rethrown to be handled by the route handler.
 *
 * @param route - Route definition
 * @param ctx - Server context
 * @throws Error if a middleware throws an error
 */
export async function runRouteMiddlewares(
  route: LoadedRoute<any, any>,
  ctx: ServerContext
): Promise<void> {
  for (let i = 0; i < route.middlewares.length; i++) {
    const mw = route.middlewares[i];
    
    try {
      await Promise.resolve(
        mw(ctx, async () => {
          /* no-op */
        })
      );
    } catch (error) {
      const reqLogger = getRequestLogger(ctx.req);
      const relativePath = route.pageFile 
        ? path.relative(process.cwd(), route.pageFile)
        : route.pattern;
      
      reqLogger.error("Route middleware failed", error instanceof Error ? error : new Error(String(error)), {
        route: route.pattern,
        middlewareIndex: i,
        pageFile: relativePath,
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

