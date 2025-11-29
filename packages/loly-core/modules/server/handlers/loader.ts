import { ServerContext, LoadedRoute, LoaderResult } from "@router/index";

/**
 * Executes the route loader if it exists.
 *
 * @param route - Route definition
 * @param ctx - Server context
 * @returns Loader result
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

