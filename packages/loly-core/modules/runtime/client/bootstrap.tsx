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
 * Sets up hot reload via Server-Sent Events (SSE) in development mode.
 * Listens for file changes and reloads the page when needed.
 */
function setupHotReload(): void {
  // Always try to connect - if the endpoint doesn't exist (production), it will fail silently
  // The server only sets up the endpoint in development mode
  try {
    console.log("[hot-reload] Attempting to connect to /__fw/hot...");
    const eventSource = new EventSource("/__fw/hot");
    let reloadTimeout: ReturnType<typeof setTimeout> | null = null;

    eventSource.addEventListener("message", (event) => {
      const data = event.data;
      if (data && data.startsWith("reload:")) {
        const filePath = data.slice(7);
        console.log(`[hot-reload] File changed: ${filePath}`);

        // Clear any pending reload
        if (reloadTimeout) {
          clearTimeout(reloadTimeout);
        }

        // Wait a bit for the bundler to finish compiling and files to be written
        // Increased timeout to ensure everything is ready
        reloadTimeout = setTimeout(() => {
          console.log("[hot-reload] Reloading page...");
          // Force reload without cache to ensure we get the latest files
          window.location.reload();
        }, 500);
      }
    });

    eventSource.addEventListener("ping", () => {
      console.log("[hot-reload] ✓ Connected to hot reload server");
    });

    eventSource.onopen = () => {
      console.log("[hot-reload] ✓ SSE connection opened");
    };

    eventSource.onerror = (error) => {
      // Log connection state for debugging
      const states = ["CONNECTING", "OPEN", "CLOSED"];
      const state = states[eventSource.readyState] || "UNKNOWN";
      
      if (eventSource.readyState === EventSource.CONNECTING) {
        // Still connecting, might be normal
        console.log("[hot-reload] Connecting...");
      } else if (eventSource.readyState === EventSource.OPEN) {
        console.warn("[hot-reload] Connection error (but connection is open):", error);
      } else {
        // Connection closed - might be production mode or server not running
        console.log("[hot-reload] Connection closed (readyState:", state, ")");
      }
      // EventSource automatically reconnects, so we don't need to do anything
    };
  } catch (error) {
    // Fail silently if EventSource is not supported
    console.log("[hot-reload] EventSource not supported or error:", error);
  }
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
  // Set up hot reload in development mode
  console.log("[client] Bootstrap starting, setting up hot reload...");
  setupHotReload();

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

