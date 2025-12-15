import { hydrateRoot } from "react-dom/client";
import { APP_CONTAINER_ID } from "./constants";
import { getWindowData, getRouterData, setRouterData, setPreservedLayoutProps } from "./window-data";
import { matchRouteClient } from "./route-matcher";
import { applyMetadata } from "./metadata";
import { AppShell } from "./AppShell";
import { setupHotReload } from "./hot-reload";
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
 * Initializes router data from server or builds it from the current URL.
 */
function initializeRouterData(
  initialUrl: string,
  initialData: InitialData | null
): void {
  let routerData = getRouterData();
  if (!routerData) {
    const url = new URL(initialUrl, window.location.origin);
    routerData = {
      pathname: url.pathname,
      params: initialData?.params || {},
      searchParams: Object.fromEntries(url.searchParams.entries()),
    };
    setRouterData(routerData);
  }
}

/**
 * Loads and hydrates the initial route.
 */
async function hydrateInitialRoute(
  container: HTMLElement,
  initialUrl: string,
  initialData: InitialData | null,
  routes: ClientRouteLoaded[],
  notFoundRoute: ClientRouteLoaded | null,
  errorRoute: ClientRouteLoaded | null
): Promise<void> {
  try {
    // Load initial route
    const initialState = await loadInitialRoute(
      initialUrl,
      initialData,
      routes,
      notFoundRoute,
      errorRoute
    );

    // Apply metadata if available
    if (initialData?.metadata) {
      try {
        applyMetadata(initialData.metadata);
      } catch (metadataError) {
        console.warn("[client] Error applying metadata:", metadataError);
        // Continue even if metadata fails
      }
    }

    // Hydrate React root
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
    throw error; // Re-throw to handle in bootstrapClient
  }
}

/**
 * Bootstraps the client-side application.
 * 
 * Simplified flow:
 * 1. Setup hot reload (development only)
 * 2. Get container and initial data
 * 3. Initialize router data
 * 4. Load and hydrate initial route
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
  // 1. Setup hot reload (development only)
  setupHotReload();

  // Start bootstrap process
  (async () => {
    try {
      // 2. Get container and initial data
      const container = document.getElementById(APP_CONTAINER_ID);
      if (!container) {
        console.error(`\n❌ [client] Hydration failed: Container #${APP_CONTAINER_ID} not found`);
        console.error("💡 This usually means:");
        console.error("  • The HTML structure doesn't match what React expects");
        console.error("  • The container was removed before hydration");
        console.error("  • There's a mismatch between SSR and client HTML\n");
        return;
      }

      const initialData = getWindowData();
      const initialUrl = window.location.pathname + window.location.search;

      // Preserve layout props from initial load (they come combined in initialData.props)
      // In SSR, layout hooks are always executed, so we need to extract layout props
      // For now, we'll preserve all props as layout props since they're combined
      // This ensures navigation items are available even in SPA navigation
      if (initialData?.props) {
        // In SSR, props are combined (layout + page), so we preserve them all as layout props
        // This is not perfect but ensures layout props are available in SPA navigation
        setPreservedLayoutProps(initialData.props);
      }

      // 3. Initialize router data
      initializeRouterData(initialUrl, initialData);

      // 4. Load and hydrate initial route
      await hydrateInitialRoute(
        container,
        initialUrl,
        initialData,
        routes,
        notFoundRoute,
        errorRoute
      );
    } catch (error) {
      // Fatal error during bootstrap - reload the page
      console.error("\n❌ [client] Fatal error during bootstrap:");
      console.error(error);
      if (error instanceof Error) {
        console.error("\nError details:");
        console.error(`  Message: ${error.message}`);
        if (error.stack) {
          console.error(`  Stack: ${error.stack}`);
        }
      }
      console.error("\n💡 Attempting page reload to recover...\n");
      window.location.reload();
    }
  })();
}

