import { ServerContext, LoadedRoute, LoaderResult } from "@router/index";

/**
 * Executes the route server hook (getServerSideProps) if it exists.
 *
 * @param route - Route definition
 * @param ctx - Server context
 * @returns Loader result
 */
export async function runRouteServerHook(
  route: LoadedRoute,
  ctx: ServerContext
): Promise<LoaderResult> {
  if (!route.loader) {
    return { props: {} };
  }

  return await route.loader(ctx);
}

