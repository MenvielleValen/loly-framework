import { getRouteData } from "../../react/cache/index";
import type { RouteDataResponse } from "../../react/cache/client-data-cache";
import { matchRouteClient } from "./route-matcher";
import { applyMetadata } from "./metadata";
import { setWindowData, getCurrentTheme, setRouterData } from "./window-data";
import type {
  ClientRouteLoaded,
  RouteViewState,
  InitialData,
  RouterData,
  ClientLoadedComponents,
} from "./types";

export type NavigationHandlers = {
  setState: (state: RouteViewState) => void;
  routes: ClientRouteLoaded[];
  notFoundRoute: ClientRouteLoaded | null;
  errorRoute: ClientRouteLoaded | null;
};

async function handleErrorRoute(
  nextUrl: string,
  json: RouteDataResponse,
  errorRoute: ClientRouteLoaded,
  setState: (state: RouteViewState) => void
): Promise<boolean> {
  try {
    const components = await errorRoute.load();
    
    // Get theme: prioritize cookie, then server, then window data, then default
    let theme: string = "light";
    if (typeof document !== "undefined") {
      const cookieMatch = document.cookie.match(/theme=([^;]+)/);
      if (cookieMatch) {
        theme = cookieMatch[1];
      } else if (json.theme) {
        theme = json.theme;
      } else {
        const currentTheme = getCurrentTheme();
        if (currentTheme) theme = currentTheme;
      }
    } else if (json.theme) {
      theme = json.theme;
    }
    
    const errorProps = {
      ...(json.props || {
        error: json.message || "An error occurred",
      }),
      theme,
    };

    const windowData: InitialData = {
      pathname: nextUrl,
      params: json.params || {},
      props: errorProps,
      metadata: json.metadata ?? null,
      theme,
      notFound: false,
      error: true,
    };

    setWindowData(windowData);

    // Update routerData
    const url = new URL(nextUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const routerData: RouterData = {
      pathname: url.pathname,
      params: json.params || {},
      searchParams: Object.fromEntries(url.searchParams.entries()),
    };
    setRouterData(routerData);

    setState({
      url: nextUrl,
      route: errorRoute,
      params: json.params || {},
      components,
      props: errorProps,
    });
    return true;
  } catch (loadError) {
    console.error("\n❌ [client] Error loading error route components:");
    console.error(loadError);
    if (loadError instanceof Error) {
      console.error(`   Message: ${loadError.message}`);
      if (loadError.stack) {
        console.error(`   Stack: ${loadError.stack.split('\n').slice(0, 3).join('\n   ')}`);
      }
    }
    console.error("💡 Falling back to full page reload\n");
    window.location.href = nextUrl;
    return false;
  }
}

async function handleNotFoundRoute(
  nextUrl: string,
  json: RouteDataResponse,
  notFoundRoute: ClientRouteLoaded | null,
  setState: (state: RouteViewState) => void
): Promise<void> {
  // Get theme: prioritize cookie, then server, then window data, then default
  let theme: string = "light";
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(/theme=([^;]+)/);
    if (cookieMatch) {
      theme = cookieMatch[1];
    } else if (json.theme) {
      theme = json.theme;
    } else {
      const currentTheme = getCurrentTheme();
      if (currentTheme) theme = currentTheme;
    }
  } else if (json.theme) {
    theme = json.theme;
  }
  
  const notFoundProps = {
    ...(json.props ?? {}),
    theme,
  };

  const windowData: InitialData = {
    pathname: nextUrl,
    params: {},
    props: notFoundProps,
    metadata: json.metadata ?? null,
    theme,
    notFound: true,
    error: false,
  };

  setWindowData(windowData);

  // Update routerData
  const url = new URL(nextUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const routerData: RouterData = {
    pathname: url.pathname,
    params: {},
    searchParams: Object.fromEntries(url.searchParams.entries()),
  };
  setRouterData(routerData);

  if (notFoundRoute) {
    const components = await notFoundRoute.load();
    setState({
      url: nextUrl,
      route: notFoundRoute,
      params: {},
      components,
      props: notFoundProps,
    });
  } else {
    setState({
      url: nextUrl,
      route: null,
      params: {},
      components: null,
      props: {},
    });
  }
}

async function handleNormalRoute(
  nextUrl: string,
  json: RouteDataResponse,
  routes: ClientRouteLoaded[],
  setState: (state: RouteViewState) => void
): Promise<boolean> {
  applyMetadata(json.metadata ?? null);
  
  // Get theme: prioritize cookie (source of truth), then server response, then window data, then default
  // Cookie is the source of truth because it persists across navigation
  let theme: string = "light"; // Default
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(/theme=([^;]+)/);
    if (cookieMatch) {
      theme = cookieMatch[1];
    } else if (json.theme) {
      theme = json.theme;
    } else {
      const currentTheme = getCurrentTheme();
      if (currentTheme) {
        theme = currentTheme;
      }
    }
  } else if (json.theme) {
    theme = json.theme;
  }
  
  // Include theme in props so layouts receive it during SPA navigation
  const newProps = {
    ...(json.props ?? {}),
    theme, // Always include theme
  };

  const matched = matchRouteClient(nextUrl, routes);

  if (!matched) {
    window.location.href = nextUrl;
    return false;
  }

  const windowData: InitialData = {
    pathname: nextUrl,
    params: matched.params,
    props: newProps,
    metadata: json.metadata ?? null,
    theme,
    notFound: false,
    error: false,
  };

  setWindowData(windowData);

  // Update routerData
  const url = new URL(nextUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const routerData: RouterData = {
    pathname: url.pathname,
    params: matched.params,
    searchParams: Object.fromEntries(url.searchParams.entries()),
  };
  setRouterData(routerData);

  // Use prefetched route if available, otherwise load it
  const prefetched = prefetchedRoutes.get(matched.route);
  const components = prefetched ? await prefetched : await matched.route.load();
  
  // Cache the loaded route for future use
  if (!prefetched) {
    prefetchedRoutes.set(matched.route, Promise.resolve(components));
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  setState({
    url: nextUrl,
    route: matched.route,
    params: matched.params,
    components,
    props: newProps,
  });

  return true;
}

export type NavigateOptions = {
  /**
   * If true, forces revalidation of route data,
   * ignoring the cache and fetching fresh data from the server.
   * Similar to Next.js's `router.refresh()` behavior.
   */
  revalidate?: boolean;
};

export async function navigate(
  nextUrl: string,
  handlers: NavigationHandlers,
  options?: NavigateOptions
): Promise<void> {
  const { setState, routes, notFoundRoute, errorRoute } = handlers;

  try {
    const { ok, json } = await getRouteData(nextUrl, {
      revalidate: options?.revalidate,
    });

    if (json && json.error) {
      if (errorRoute) {
        const handled = await handleErrorRoute(
          nextUrl,
          json,
          errorRoute,
          setState
        );
        if (handled) return;
      } else {
        console.warn(
          "[client] Error route not available, reloading page.",
          errorRoute
        );
        window.location.href = nextUrl;
        return;
      }
    }

    // 🔴 HTTP error (404/500/etc)
    if (!ok) {
      if (json?.redirect) {
        window.location.href = json.redirect.destination;
        return;
      }
      window.location.href = nextUrl;
      return;
    }

    // Redirect via JSON
    if (json.redirect) {
      window.location.href = json.redirect.destination;
      return;
    }

    // Handle notFound
    if (json.notFound) {
      await handleNotFoundRoute(nextUrl, json, notFoundRoute, setState);
      return;
    }

    // Normal route
    await handleNormalRoute(nextUrl, json, routes, setState);
  } catch (err) {
    console.error("[client] Error fetching FW data:", err);
    window.location.href = nextUrl;
  }
}

// Cache for prefetched routes to avoid loading twice
const prefetchedRoutes = new WeakMap<ClientRouteLoaded, Promise<ClientLoadedComponents>>();

/**
 * Prefetches a route's components when user hovers over a link.
 * This improves perceived performance by loading the route before the user clicks.
 */
function prefetchRoute(
  url: string,
  routes: ClientRouteLoaded[],
  notFoundRoute: ClientRouteLoaded | null
): void {
  const [pathname] = url.split("?");
  const matched = matchRouteClient(pathname, routes);
  
  if (!matched) {
    // If no match, might be not-found route
    if (notFoundRoute) {
      const existing = prefetchedRoutes.get(notFoundRoute);
      if (!existing) {
        const promise = notFoundRoute.load();
        prefetchedRoutes.set(notFoundRoute, promise);
      }
    }
    return;
  }

  // Prefetch the matched route if not already prefetched
  const existing = prefetchedRoutes.get(matched.route);
  if (!existing) {
    const promise = matched.route.load();
    prefetchedRoutes.set(matched.route, promise);
  }
}

/**
 * Creates a hover handler for prefetching routes on link hover.
 */
export function createHoverHandler(
  routes: ClientRouteLoaded[],
  notFoundRoute: ClientRouteLoaded | null
): (ev: MouseEvent) => void {
  return function handleHover(ev: MouseEvent) {
    try {
      const target = ev.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (anchor.target && anchor.target !== "_self") return;

      const nextUrl = url.pathname + url.search;
      const currentUrl = window.location.pathname + window.location.search;
      if (nextUrl === currentUrl) return;

      // Prefetch the route
      prefetchRoute(nextUrl, routes, notFoundRoute);
    } catch (error) {
      // Silently fail - prefetch is an optimization, not critical
    }
  };
}

export function createClickHandler(
  navigate: (url: string, options?: NavigateOptions) => void
): (ev: MouseEvent) => void {
  return function handleClick(ev: MouseEvent) {
    try {
      // Exit early if event was already prevented
      if (ev.defaultPrevented) return;
      
      // Verify it's a real mouse event (not synthetic or keyboard)
      if (ev.type !== "click") return;
      if (ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      
      // Verify event has valid coordinates (real mouse events have them)
      const target = ev.target as HTMLElement | null;
      if (ev.clientX === 0 && ev.clientY === 0 && ev.detail === 0) {
        // Could be a synthetic event, be more cautious
        if (target) {
          const tagName = target.tagName.toLowerCase();
          if (tagName === "input" || tagName === "textarea" || tagName === "button" || tagName === "select") {
            return; // It's an input, don't process synthetic events
          }
        }
      }

      if (!target) return;

      // Check FIRST if target is an interactive element (faster)
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "button" ||
        tagName === "select" ||
        target.isContentEditable ||
        target.getAttribute("contenteditable") === "true"
      ) {
        return; // It's an interactive element, don't process
      }

      // Check if it's inside an interactive element using closest (more efficient than composedPath)
      const interactiveParent = target.closest("input, textarea, button, select, [contenteditable], label");
      if (interactiveParent) {
        // If parent is a label, check if it has an associated control
        if (interactiveParent.tagName.toLowerCase() === "label") {
          const label = interactiveParent as HTMLLabelElement;
          if (label.control) {
            return; // Label has an associated control (input, etc)
          }
        } else {
          return; // It's inside an interactive element
        }
      }

      // Only search for anchor if it's not an interactive element
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;
    if (href.startsWith("#")) return;

    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (anchor.target && anchor.target !== "_self") return;

    ev.preventDefault();

    const nextUrl = url.pathname + url.search;
    const currentUrl = window.location.pathname + window.location.search;
    if (nextUrl === currentUrl) return;

    // Detect if link has data-revalidate to force revalidation
    const shouldRevalidate =
      anchor.hasAttribute("data-revalidate") &&
      anchor.getAttribute("data-revalidate") !== "false";

    window.history.pushState({}, "", nextUrl);
    navigate(nextUrl, shouldRevalidate ? { revalidate: true } : undefined);
    } catch (error) {
      // Silenciar errores para evitar bloquear el navegador
      console.error("[navigation] Error in click handler:", error);
    }
  };
}

export function createPopStateHandler(
  navigate: (url: string, options?: NavigateOptions) => void
): () => void {
  return function handlePopState() {
    const nextUrl = window.location.pathname + window.location.search;
    navigate(nextUrl);
  };
}

