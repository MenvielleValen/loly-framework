import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { RouterContext } from "../../../runtime/client/RouterContext";
import { getWindowData, getRouterData } from "../../../runtime/client/window-data";
import { ROUTER_NAVIGATE_KEY } from "../../../runtime/client/constants";

export interface Router {
  /**
   * Navigate to a new route.
   * @param url - The URL to navigate to (e.g., "/about" or "/blog/[slug]" with params)
   * @param options - Navigation options
   */
  push: (url: string, options?: { revalidate?: boolean }) => Promise<void>;
  
  /**
   * Replace the current route without adding to history.
   * @param url - The URL to navigate to
   * @param options - Navigation options
   */
  replace: (url: string, options?: { revalidate?: boolean }) => Promise<void>;
  
  /**
   * Go back in the browser history.
   */
  back: () => void;
  
  /**
   * Refresh the current route data by revalidating.
   */
  refresh: () => Promise<void>;
  
  /**
   * Current pathname (e.g., "/blog/my-post")
   */
  pathname: string;
  
  /**
   * Query parameters from the URL (e.g., ?id=123&name=test)
   * Alias for searchParams for backward compatibility
   */
  query: Record<string, string>;
  
  /**
   * Search parameters from the URL (e.g., ?id=123&name=test)
   */
  searchParams: Record<string, unknown>;
  
  /**
   * Dynamic route parameters (e.g., { slug: "my-post" } for /blog/[slug])
   */
  params: Record<string, string>;
}

/**
 * Hook to access router functionality and current route information.
 * 
 * Provides methods to navigate programmatically and access current route data.
 * 
 * @returns Router object with navigation methods and route information
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const router = useRouter();
 *   
 *   const handleClick = () => {
 *     router.push("/about");
 *   };
 *   
 *   return (
 *     <div>
 *       <p>Current path: {router.pathname}</p>
 *       <p>Params: {JSON.stringify(router.params)}</p>
 *       <button onClick={handleClick}>Go to About</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Navigate with dynamic params
 * router.push("/blog/my-post");
 * 
 * // Replace current route
 * router.replace("/login");
 * 
 * // Refresh current route data
 * await router.refresh();
 * ```
 */
export function useRouter(): Router {
  // Try to get context, but don't throw if it's not available (SSR)
  const context = useContext(RouterContext);
  const navigate = context?.navigate;
  
  // Use a ref to store navigate so we can access it in callbacks even if context updates
  // Initialize with current navigate value
  const navigateRef = useRef(navigate);
  
  // Update ref when navigate changes (this ensures we always have the latest value)
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  
  const [routeData, setRouteData] = useState(() => {
    // During SSR, return empty/default values
    if (typeof window === "undefined") {
      return {
        pathname: "",
        query: {},
        searchParams: {},
        params: {},
      };
    }
    
    // On client, get data from window
    const data = getWindowData();
    const routerData = getRouterData();
    
    // Parse search params from URL if routerData is not available
    const searchParams = routerData?.searchParams || parseQueryString(window.location.search);
    
    return {
      pathname: routerData?.pathname || data?.pathname || window.location.pathname,
      query: searchParams as Record<string, string>, // For backward compatibility
      searchParams: searchParams,
      params: routerData?.params || data?.params || {},
    };
  });

  // Listen for route changes (only on client)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleDataRefresh = () => {
      const data = getWindowData();
      const routerData = getRouterData();
      const currentPathname = window.location.pathname;
      const currentSearch = window.location.search;
      
      const searchParams = routerData?.searchParams || parseQueryString(currentSearch);
      
      setRouteData({
        pathname: routerData?.pathname || data?.pathname || currentPathname,
        query: searchParams as Record<string, string>, // For backward compatibility
        searchParams: searchParams,
        params: routerData?.params || data?.params || {},
      });
    };

    // Listen for navigation events
    window.addEventListener("fw-data-refresh", handleDataRefresh);
    window.addEventListener("fw-router-data-refresh", handleDataRefresh);
    
    // Also listen for popstate (browser back/forward)
    const handlePopState = () => {
      handleDataRefresh();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("fw-data-refresh", handleDataRefresh);
      window.removeEventListener("fw-router-data-refresh", handleDataRefresh);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const push = useCallback(
    async (url: string, options?: { revalidate?: boolean }) => {
      const fullUrl = url.startsWith("/") ? url : `/${url}`;
      
      /**
       * SOLUTION: Multi-source navigate function resolution
       * 
       * During React hydration, RouterContext may not be available immediately.
       * We try three sources in order:
       * 1. navigateRef.current - Most up-to-date, updated via useEffect
       * 2. navigate from context - Direct context access
       * 3. window.__LOLY_ROUTER_NAVIGATE__ - Global fallback exposed by AppShell
       * 
       * This ensures SPA navigation works even during hydration timing issues.
       */
      const getCurrentNavigate = () => {
        if (navigateRef.current) return navigateRef.current;
        if (navigate) return navigate;
        if (typeof window !== "undefined" && (window as any)[ROUTER_NAVIGATE_KEY]) {
          return (window as any)[ROUTER_NAVIGATE_KEY];
        }
        return null;
      };
      
      let currentNavigate = getCurrentNavigate();
      
      if (typeof window === "undefined") {
        return; // SSR
      }
      
      // Wait for context during hydration (up to 100ms)
      if (!currentNavigate) {
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
          currentNavigate = getCurrentNavigate();
          if (currentNavigate) break;
        }
      }
      
      // Final fallback: full page reload if navigate is still unavailable
      if (!currentNavigate) {
        window.location.href = fullUrl;
        return;
      }
      
      // Check if we're already on this URL (same as link handler)
      const currentUrl = window.location.pathname + window.location.search;
      if (fullUrl === currentUrl) {
        return; // Already on this route, no need to navigate
      }
      
      // Update URL in browser history (same as link handler does)
      // This is done BEFORE navigation to match link behavior
      window.history.pushState({}, "", fullUrl);
      
      // Navigate using SPA navigation (same as link handler)
      // If navigation fails, navigate() will handle the reload internally
      await currentNavigate(fullUrl, options);
    },
    [navigate] // Include navigate in dependencies so it updates when context becomes available
  );

  const replace = useCallback(
    async (url: string, options?: { revalidate?: boolean }) => {
      const fullUrl = url.startsWith("/") ? url : `/${url}`;
      
      const getCurrentNavigate = () => {
        if (navigateRef.current) return navigateRef.current;
        if (navigate) return navigate;
        if (typeof window !== "undefined" && (window as any)[ROUTER_NAVIGATE_KEY]) {
          return (window as any)[ROUTER_NAVIGATE_KEY];
        }
        return null;
      };
      
      let currentNavigate = getCurrentNavigate();
      
      if (typeof window === "undefined") {
        return;
      }
      
      if (!currentNavigate) {
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
          currentNavigate = getCurrentNavigate();
          if (currentNavigate) break;
        }
      }
      
      if (!currentNavigate) {
        window.location.replace(fullUrl);
        return;
      }
      
      // Update URL in browser history using replace (doesn't add to history)
      window.history.replaceState({}, "", fullUrl);
      
      // Navigate using SPA navigation
      await currentNavigate(fullUrl, options);
    },
    [navigate]
  );

  const back = useCallback(() => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  }, []);

  const refresh = useCallback(async () => {
    const currentUrl = typeof window !== "undefined" 
      ? window.location.pathname + window.location.search 
      : routeData.pathname;
    
    const getCurrentNavigate = () => {
      if (navigateRef.current) return navigateRef.current;
      if (navigate) return navigate;
      if (typeof window !== "undefined" && (window as any)[ROUTER_NAVIGATE_KEY]) {
        return (window as any)[ROUTER_NAVIGATE_KEY];
      }
      return null;
    };
    
    let currentNavigate = getCurrentNavigate();
    
    if (typeof window === "undefined") {
      return;
    }
    
    if (!currentNavigate) {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
        currentNavigate = getCurrentNavigate();
        if (currentNavigate) break;
      }
    }
    
    if (!currentNavigate) {
      window.location.reload();
      return;
    }
    
    await currentNavigate(currentUrl, { revalidate: true });
  }, [navigate, routeData.pathname]);

  return {
    push,
    replace,
    back,
    refresh,
    pathname: routeData.pathname,
    query: routeData.query,
    searchParams: routeData.searchParams,
    params: routeData.params,
  };
}

/**
 * Parse query string into an object.
 * @param search - Query string (e.g., "?id=123&name=test")
 * @returns Object with query parameters
 */
function parseQueryString(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!search || search.length === 0) return params;
  
  const queryString = search.startsWith("?") ? search.slice(1) : search;
  const pairs = queryString.split("&");
  
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : "";
    }
  }
  
  return params;
}
