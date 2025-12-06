import { useState, useEffect, useCallback, useContext } from "react";
import { RouterContext } from "../../../runtime/client/RouterContext";
import { getWindowData } from "../../../runtime/client/window-data";

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
   */
  query: Record<string, string>;
  
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
  
  const [routeData, setRouteData] = useState(() => {
    // During SSR, return empty/default values
    if (typeof window === "undefined") {
      return {
        pathname: "",
        query: {},
        params: {},
      };
    }
    
    // On client, get data from window
    const data = getWindowData();
    return {
      pathname: data?.pathname || window.location.pathname,
      query: parseQueryString(window.location.search),
      params: data?.params || {},
    };
  });

  // Listen for route changes (only on client)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleDataRefresh = () => {
      const data = getWindowData();
      const currentPathname = window.location.pathname;
      const currentSearch = window.location.search;
      
      setRouteData({
        pathname: data?.pathname || currentPathname,
        query: parseQueryString(currentSearch),
        params: data?.params || {},
      });
    };

    // Listen for navigation events
    window.addEventListener("fw-data-refresh", handleDataRefresh);
    
    // Also listen for popstate (browser back/forward)
    const handlePopState = () => {
      handleDataRefresh();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("fw-data-refresh", handleDataRefresh);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const push = useCallback(
    async (url: string, options?: { revalidate?: boolean }) => {
      const fullUrl = url.startsWith("/") ? url : `/${url}`;
      
      // During SSR or if context is not available, use window.location
      if (!navigate) {
        if (typeof window !== "undefined") {
          window.location.href = fullUrl;
        }
        return;
      }
      
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", fullUrl);
      }
      await navigate(fullUrl, options);
    },
    [navigate]
  );

  const replace = useCallback(
    async (url: string, options?: { revalidate?: boolean }) => {
      const fullUrl = url.startsWith("/") ? url : `/${url}`;
      
      // During SSR or if context is not available, use window.location
      if (!navigate) {
        if (typeof window !== "undefined") {
          window.location.replace(fullUrl);
        }
        return;
      }
      
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", fullUrl);
      }
      await navigate(fullUrl, options);
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
    
    // During SSR or if context is not available, reload the page
    if (!navigate) {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
      return;
    }
    
    await navigate(currentUrl, { revalidate: true });
  }, [navigate, routeData.pathname]);

  return {
    push,
    replace,
    back,
    refresh,
    pathname: routeData.pathname,
    query: routeData.query,
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
