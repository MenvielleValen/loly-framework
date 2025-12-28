import { hydrateRoot, createRoot } from "react-dom/client";
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
  ClientLoadedComponents,
} from "./types";

/**
 * Detects if components are client components using the dependencies manifest.
 */
function detectClientComponents(
  routePattern: string,
  components: ClientLoadedComponents
): ClientLoadedComponents {
  // Try to get dependencies manifest from window
  let dependenciesManifest: any = null;
  if (typeof window !== "undefined" && (window as any).__LOLY_ROUTE_DEPENDENCIES__) {
    dependenciesManifest = (window as any).__LOLY_ROUTE_DEPENDENCIES__;
  }

  if (!dependenciesManifest || !dependenciesManifest.routes) {
    // No manifest available, return components as-is
    return components;
  }

  const routeDeps = dependenciesManifest.routes[routePattern];
  if (!routeDeps) {
    return components;
  }

  // Check if page is a client component (from manifest)
  const isPageClientComponent = routeDeps.isPageClientComponent || false;
  const pageFilePath = routeDeps.pageFilePath || (routePattern === "/" 
    ? "app/page.tsx"
    : `app${routePattern}/page.tsx`);
  
  // Check which layouts are client components (from manifest)
  // The manifest has isLayoutClientComponent array that matches the layoutFiles order
  const isLayoutClientComponent = routeDeps.isLayoutClientComponent 
    ? routeDeps.isLayoutClientComponent.slice(0, components.layouts.length)
    : new Array(components.layouts.length).fill(false);
  
  // Get layout file paths for client components
  const layoutFilePaths = routeDeps.layoutFilePaths || [];
  // Map layout file paths to the correct layout indices
  // We need to match them with the isLayoutClientComponent array
  const clientComponentLayoutPaths: (string | undefined)[] = new Array(components.layouts.length).fill(undefined);
  if (routeDeps.isLayoutClientComponent && routeDeps.layoutFilePaths) {
    let layoutFilePathIndex = 0;
    for (let i = 0; i < isLayoutClientComponent.length; i++) {
      if (isLayoutClientComponent[i] && layoutFilePathIndex < routeDeps.layoutFilePaths.length) {
        clientComponentLayoutPaths[i] = routeDeps.layoutFilePaths[layoutFilePathIndex];
        layoutFilePathIndex++;
      }
    }
  }

  return {
    ...components,
    isPageClientComponent,
    isLayoutClientComponent,
    clientComponentFilePaths: {
      page: isPageClientComponent ? pageFilePath : undefined,
      layouts: clientComponentLayoutPaths.some(p => p !== undefined) 
        ? clientComponentLayoutPaths
        : undefined,
    },
  };
}

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
  let initialComponents: ClientLoadedComponents | null = null;

  if (isInitialError && errorRoute) {
    initialRoute = errorRoute;
    initialParams = initialData?.params ?? {};
    const loaded = await errorRoute.load();
    initialComponents = detectClientComponents(errorRoute.pattern, loaded);
  } else if (isInitialNotFound && notFoundRoute) {
    initialRoute = notFoundRoute;
    initialParams = {};
    const loaded = await notFoundRoute.load();
    initialComponents = detectClientComponents(notFoundRoute.pattern, loaded);
  } else {
    const match = matchRouteClient(initialUrl, routes);
    if (match) {
      initialRoute = match.route;
      initialParams = match.params;
      const loaded = await match.route.load();
      initialComponents = detectClientComponents(match.route.pattern, loaded);
    } else if (notFoundRoute) {
      initialRoute = notFoundRoute;
      initialParams = {};
      const loaded = await notFoundRoute.load();
      initialComponents = detectClientComponents(notFoundRoute.pattern, loaded);
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

function getRouteDependencies(
  routePattern: string
): any | null {
  if (typeof window === "undefined") return null;
  const deps = (window as any).__LOLY_ROUTE_DEPENDENCIES__;
  if (!deps || !deps.routes) return null;
  return deps.routes[routePattern] || null;
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
    // Use initialData.pathname if available (rewritten path from server)
    // This ensures rewrites work correctly on the client
    const pathname = initialData?.pathname || url.pathname;
    routerData = {
      pathname,
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
    // Note: hydrateRoot doesn't return a promise, so we need to wait for hydration to complete
    // using other means (requestIdleCallback, requestAnimationFrame, etc.)
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
      const initialUrl = (initialData?.pathname || window.location.pathname) + window.location.search;

      // Preserve layout props from initial load
      if (initialData?.props) {
        setPreservedLayoutProps(initialData.props);
      }

      // Initialize router data
      const routerPathname = initialData?.pathname || window.location.pathname;
      initializeRouterData(routerPathname + window.location.search, initialData);

      // Detect if this route has client page/layout components
      // Note: directClientComponents (components inside server components) should use
      // the normal hydration path + islands, not client takeover
      const routePattern = initialData?.pathname || window.location.pathname;
      const routeDeps = getRouteDependencies(routePattern);
      const hasClientIslands =
        !!routeDeps &&
        (
          routeDeps.isPageClientComponent === true ||
          (routeDeps.isLayoutClientComponent && routeDeps.isLayoutClientComponent.some((v: boolean) => v))
        );

      // Load initial state (needed for AppShell)
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
        }
      }

      if (hasClientIslands) {
        // Client takeover: render AppShell with createRoot (avoid hydration mismatch)
        container.innerHTML = "";
        const root = createRoot(container);
        root.render(
          <AppShell
            initialState={initialState}
            routes={routes}
            notFoundRoute={notFoundRoute}
            errorRoute={errorRoute}
          />
        );
        // Islands not needed; client components render directly
        return;
      }

      // Normal hydration path (includes direct client components via islands)
      await hydrateInitialRoute(
        container,
        initialUrl,
        initialData,
        routes,
        notFoundRoute,
        errorRoute
      );
      
      // Mount islands after hydration
      try {
        await new Promise<void>((resolve) => {
          if (typeof queueMicrotask !== "undefined") {
            queueMicrotask(resolve);
          } else {
            setTimeout(resolve, 0);
          }
        });
        const { mountClientIslands } = await import("./mount-client-islands");
        await mountClientIslands(container);
      } catch (error) {
        console.warn("[client] Failed to mount client component islands:", error);
      }
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

