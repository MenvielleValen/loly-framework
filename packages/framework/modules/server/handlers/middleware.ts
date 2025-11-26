import { ServerContext, LoadedRoute } from "@router/index";

/**
 * Executes route middlewares in chain.
 *
 * @param route - Route definition
 * @param ctx - Server context
 */
export async function runRouteMiddlewares(
  route: LoadedRoute,
  ctx: ServerContext
): Promise<void> {
  for (const mw of route.middlewares) {
    await Promise.resolve(
      mw(ctx, async () => {
        /* no-op */
      })
    );
    if (ctx.res.headersSent) {
      return;
    }
  }
}

