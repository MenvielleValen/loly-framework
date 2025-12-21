/**
 * Path utilities for building route paths and regex patterns.
 */

/**
 * Checks if a directory name is a route group.
 * Route groups are directories wrapped in parentheses like (dashboard) or (landing).
 * They organize routes without appearing in the URL.
 * 
 * @param dirName - Directory name to check
 * @returns true if the directory is a route group
 * 
 * @example
 * isRouteGroup('(dashboard)') // true
 * isRouteGroup('(landing)') // true
 * isRouteGroup('dashboard') // false
 * isRouteGroup('settings') // false
 * 
 * @future
 * This function can be extended to support special route group types like (modal)
 * for parallel routes. For example:
 * - isRouteGroup('(modal)') could return a special type indicating it's a parallel route
 * - The routing system could handle parallel routes differently from regular route groups
 */
export function isRouteGroup(dirName: string): boolean {
  return dirName.startsWith('(') && dirName.endsWith(')');
}

/**
 * Gets the route group name from a directory name.
 * Extracts the name inside parentheses, e.g., "(dashboard)" -> "dashboard".
 * 
 * @param dirName - Directory name (should be a route group)
 * @returns The route group name without parentheses, or null if not a route group
 * 
 * @example
 * getRouteGroupName('(dashboard)') // 'dashboard'
 * getRouteGroupName('(landing)') // 'landing'
 * getRouteGroupName('dashboard') // null
 * 
 * @future
 * This function can be used to identify special route group types:
 * - getRouteGroupName('(modal)') -> 'modal' (for parallel routes)
 * - The routing system can then handle 'modal' as a special case
 */
export function getRouteGroupName(dirName: string): string | null {
  if (!isRouteGroup(dirName)) return null;
  return dirName.slice(1, -1); // Remove parentheses
}

/**
 * Builds a route path from a relative directory path.
 * Route groups (directories in parentheses) are filtered out and don't appear in the URL.
 * 
 * @param relDir - Relative directory path (e.g., '', 'about', 'blog\\[slug]', '(dashboard)\\settings')
 * @returns Route path (e.g., '/', '/about', '/blog/[slug]', '/settings')
 * 
 * @example
 * buildRoutePathFromDir('') // '/'
 * buildRoutePathFromDir('about') // '/about'
 * buildRoutePathFromDir('blog\\[slug]') // '/blog/[slug]'
 * buildRoutePathFromDir('(dashboard)\\settings') // '/settings' (route group filtered out)
 * buildRoutePathFromDir('(dashboard)\\(landing)\\about') // '/about' (both route groups filtered out)
 */
export function buildRoutePathFromDir(relDir: string): string {
  if (!relDir || relDir === ".") return "/";
  const clean = relDir.replace(/\\/g, "/");
  
  // Split into segments and filter out route groups
  const segments = clean.split("/").filter(seg => {
    // Filter out route groups (directories in parentheses)
    return !isRouteGroup(seg);
  });
  
  // If no segments remain after filtering, return root
  if (segments.length === 0) return "/";
  
  return "/" + segments.join("/");
}

/**
 * Builds a regex pattern and parameter names from a route path.
 * 
 * Supports:
 * - Static segments: `/about` → `/^\/about\/?$/`
 * - Dynamic segments: `[slug]` → captures single segment
 * - Catch-all segments: `[...path]` → captures remaining path (must be last)
 * 
 * @param routePath - Route path pattern (e.g., '/blog/[slug]', '/post/[...path]')
 * @returns Object with regex pattern and parameter names
 * 
 * @example
 * buildRegexFromRoutePath('/blog/[slug]')
 * // { regex: /^\/blog\/([^\/]+)\/?$/, paramNames: ['slug'] }
 * 
 * buildRegexFromRoutePath('/post/[...path]')
 * // { regex: /^\/post\/(.+)\/?$/, paramNames: ['path'] }
 * 
 * @throws Error if catch-all segment is not the last segment
 */
export function buildRegexFromRoutePath(routePath: string): {
  regex: RegExp;
  paramNames: string[];
} {
  const segments = routePath.split("/").filter(Boolean);
  const paramNames: string[] = [];
  const regexParts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // 1) Catch-all: [...slug]
    if (seg.startsWith("[...") && seg.endsWith("]")) {
      const paramName = seg.slice(4, -1); // "[...slug]" -> "slug"
      paramNames.push(paramName);

      // Catch-all must be the last segment
      if (i !== segments.length - 1) {
        throw new Error(
          `Catch-all segment "${seg}" in "${routePath}" must be the last segment.`
        );
      }

      // (.+) = one or more characters (non-empty), allows "/" inside
      regexParts.push("(.+)");
      continue;
    }

    // 2) Normal param: [slug]
    if (seg.startsWith("[") && seg.endsWith("]")) {
      const paramName = seg.slice(1, -1);
      paramNames.push(paramName);
      regexParts.push("([^/]+)");
      continue;
    }

    // 3) Static segment - escape special regex characters
    const escaped = seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regexParts.push(escaped);
  }

  const regexSource = "^/" + regexParts.join("/") + "/?$";
  const regex = new RegExp(regexSource);

  return { regex, paramNames };
}

