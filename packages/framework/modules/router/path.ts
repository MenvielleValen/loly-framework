/**
 * Path utilities for building route paths and regex patterns.
 */

/**
 * Builds a route path from a relative directory path.
 * 
 * @param relDir - Relative directory path (e.g., '', 'about', 'blog\\[slug]')
 * @returns Route path (e.g., '/', '/about', '/blog/[slug]')
 * 
 * @example
 * buildRoutePathFromDir('') // '/'
 * buildRoutePathFromDir('about') // '/about'
 * buildRoutePathFromDir('blog\\[slug]') // '/blog/[slug]'
 */
export function buildRoutePathFromDir(relDir: string): string {
  if (!relDir || relDir === ".") return "/";
  const clean = relDir.replace(/\\/g, "/");
  return "/" + clean;
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

