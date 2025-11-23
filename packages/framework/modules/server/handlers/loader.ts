import { ServerContext, LoadedRoute, LoaderResult } from "@router/index";

/**
 * Ejecuta el loader de una ruta si existe.
 */
export async function runRouteLoader(
  route: LoadedRoute,
  ctx: ServerContext
): Promise<LoaderResult> {
  if (!route.loader) {
    return { props: {} };
  }

  return await route.loader(ctx);
}

