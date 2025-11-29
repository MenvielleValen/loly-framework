import { hydrateRoot } from "react-dom/client";
import { APP_CONTAINER_ID } from "./constants";
import { getWindowData } from "./window-data";
import { matchRouteClient } from "./route-matcher";
import { applyMetadata } from "./metadata";
import { AppShell } from "./AppShell";
import type {
  InitialData,
  ClientRouteLoaded,
  RouteViewState,
} from "./types";

export async function loadInitialRoute(
  initialUrl: string,
  initialData: InitialData | null,
  routes: ClientRouteLoaded[],
  notFoundRoute: ClientRouteLoaded | null,
  errorRoute: ClientRouteLoaded | null
): Promise<RouteViewState> {
  const isInitialNotFound = initialData?.notFound === true;
  const isInitialError = initialData?.error === true;

  let initialRoute: ClientRouteLoaded | null = null;
  let initialParams: Record<string, string> = {};
  let initialComponents = null;

  if (isInitialError && errorRoute) {
    initialRoute = errorRoute;
    initialParams = initialData?.params ?? {};
    initialComponents = await errorRoute.load();
  } else if (isInitialNotFound && notFoundRoute) {
    initialRoute = notFoundRoute;
    initialParams = {};
    initialComponents = await notFoundRoute.load();
  } else {
    const match = matchRouteClient(initialUrl, routes);
    if (match) {
      initialRoute = match.route;
      initialParams = match.params;
      initialComponents = await match.route.load();
    } else if (notFoundRoute) {
      initialRoute = notFoundRoute;
      initialParams = {};
      initialComponents = await notFoundRoute.load();
    } else {
      console.warn(
        `[client] No route match found for ${initialUrl}. Available routes:`,
        routes.map((r) => r.pattern)
      );
    }
  }

  return {
    url: initialUrl,
    route: initialRoute,
    params: initialParams,
    components: initialComponents,
    props: initialData?.props ?? {},
  };
}

/**
 * Bootstraps the client-side application.
 *
 * @param routes - Array of client routes
 * @param notFoundRoute - Not-found route definition
 * @param errorRoute - Error route definition
 */
export function bootstrapClient(
  routes: ClientRouteLoaded[],
  notFoundRoute: ClientRouteLoaded | null,
  errorRoute: ClientRouteLoaded | null = null
): void {
  (async function bootstrap() {
    const container = document.getElementById(APP_CONTAINER_ID);
    const initialData = getWindowData();

    if (!container) {
      console.error(`Container #${APP_CONTAINER_ID} not found for hydration`);
      return;
    }

    const initialUrl = window.location.pathname + window.location.search;

    try {
      const initialState = await loadInitialRoute(
        initialUrl,
        initialData,
        routes,
        notFoundRoute,
        errorRoute
      );

      if (initialData?.metadata) {
        applyMetadata(initialData.metadata);
      }

      hydrateRoot(
        container,
        <AppShell
          initialState={initialState}
          routes={routes}
          notFoundRoute={notFoundRoute}
          errorRoute={errorRoute}
        />
      );
    } catch (error) {
      console.error(
        "[client] Error loading initial route components for",
        initialUrl,
        error
      );

      window.location.reload();
    }
  })();
}

