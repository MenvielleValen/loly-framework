import { ApiRoute, LoadedRoute } from "./index.types";

/**
 * Matches a URL path against loaded routes and returns the matched route with params.
 * 
 * @param routes - Array of loaded routes to match against
 * @param urlPath - URL path to match (e.g., '/blog/my-post')
 * @returns Matched route with extracted parameters, or null if no match
 * 
 * @example
 * const routes = loadRoutes('app');
 * const match = matchRoute(routes, '/blog/my-post');
 * // { route: LoadedRoute, params: { slug: 'my-post' } }
 */
export function matchRoute(
  routes: LoadedRoute[],
  urlPath: string
): { route: LoadedRoute; params: Record<string, string> } | null {
  // Normalize the path before matching (remove trailing slash, ensure it starts with /)
  const normalizedPath = urlPath.replace(/\/$/, "") || "/";
  
  for (const route of routes) {
    const match = route.regex.exec(normalizedPath);
    if (!match) continue;

    const params: Record<string, string> = {};
    route.paramNames.forEach((name, idx) => {
      params[name] = decodeURIComponent(match[idx + 1] || "");
    });

    return { route, params };
  }

  return null;
}

/**
 * Matches a URL path against API routes and returns the matched route with params.
 * 
 * @param routes - Array of API routes to match against
 * @param pathname - URL path to match (e.g., '/api/posts/123')
 * @returns Matched API route with extracted parameters, or null if no match
 * 
 * @example
 * const apiRoutes = loadApiRoutes('app');
 * const match = matchApiRoute(apiRoutes, '/api/posts/123');
 * // { route: ApiRoute, params: { id: '123' } }
 */
export function matchApiRoute(
  routes: ApiRoute[],
  pathname: string
): { route: ApiRoute; params: Record<string, string> } | null {
  for (const r of routes) {
    const match = r.regex.exec(pathname);
    if (!match) continue;

    const params: Record<string, string> = {};
    r.paramNames.forEach((name, idx) => {
      params[name] = match[idx + 1];
    });

    return { route: r, params };
  }
  return null;
}

