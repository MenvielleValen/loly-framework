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
  console.log("[loly:runtime] bootstrapClient called", {
    routesCount: routes.length,
    hasNotFound: !!notFoundRoute,
    hasError: !!errorRoute,
  });

  (async function bootstrap() {
    const container = document.getElementById(APP_CONTAINER_ID);
    const initialData = getWindowData();

    console.log("[loly:runtime] bootstrap starting", {
      hasContainer: !!container,
      containerId: APP_CONTAINER_ID,
      hasInitialData: !!initialData,
    });

    if (!container) {
      console.error(`[loly:runtime] Container #${APP_CONTAINER_ID} not found for hydration`);
      return;
    }

    const initialUrl = window.location.pathname + window.location.search;
    console.log("[loly:runtime] Loading initial route", { initialUrl });

    try {
      const initialState = await loadInitialRoute(
        initialUrl,
        initialData,
        routes,
        notFoundRoute,
        errorRoute
      );

      console.log("[loly:runtime] Initial route loaded", {
        url: initialState.url,
        hasRoute: !!initialState.route,
        hasComponents: !!initialState.components,
      });

      if (initialData?.metadata) {
        applyMetadata(initialData.metadata);
      }

      console.log("[loly:runtime] Hydrating React app");
      hydrateRoot(
        container,
        <AppShell
          initialState={initialState}
          routes={routes}
          notFoundRoute={notFoundRoute}
          errorRoute={errorRoute}
        />
      );
      console.log("[loly:runtime] React app hydrated successfully");
    } catch (error) {
      console.error(
        "[loly:runtime] Error loading initial route components for",
        initialUrl,
        error
      );

      window.location.reload();
    }
  })();
}

