import { ServerContext, LoadedRoute } from "@router/index";

/**
 * Ejecuta los middlewares de una ruta en cadena.
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
    // Si el middleware ya respondió, no seguimos
    if (ctx.res.headersSent) {
      return;
    }
  }
}

