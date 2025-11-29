import path from "path";

/**
 * Builds a URL path from a route pattern and parameters.
 * 
 * Replaces dynamic segments ([slug], [...path]) with actual parameter values.
 * 
 * @param pattern - Route pattern (e.g., '/blog/[slug]', '/post/[...path]')
 * @param params - Parameter values to substitute
 * @returns Actual URL path
 * 
 * @example
 * buildPathFromPattern('/blog/[slug]', { slug: 'my-post' })
 * // '/blog/my-post'
 * 
 * buildPathFromPattern('/post/[...path]', { path: 'a/b/c' })
 * // '/post/a/b/c'
 * 
 * @throws Error if required parameters are missing
 */
export function buildPathFromPattern(
  pattern: string,
  params: Record<string, string>
): string {
  const segments = pattern.split("/").filter(Boolean);
  const parts: string[] = [];

  for (const seg of segments) {
    // Catch-all parameter: [...path]
    if (seg.startsWith("[...") && seg.endsWith("]")) {
      const name = seg.slice(4, -1);
      const value = params[name];
      if (!value) {
        throw new Error(
          `Missing parameter "${name}" for catch-all pattern "${pattern}"`
        );
      }
      parts.push(value);
    }
    // Normal parameter: [slug]
    else if (seg.startsWith("[") && seg.endsWith("]")) {
      const name = seg.slice(1, -1);
      const value = params[name];
      if (!value) {
        throw new Error(`Missing parameter "${name}" for pattern "${pattern}"`);
      }
      parts.push(encodeURIComponent(value));
    }
    // Static segment
    else {
      parts.push(seg);
    }
  }

  return "/" + parts.join("/");
}

/**
 * Converts a URL path to an output directory path.
 * 
 * @param baseDir - Base output directory
 * @param urlPath - URL path (e.g., '/blog/my-post' or '/')
 * @returns Directory path relative to baseDir
 * 
 * @example
 * pathToOutDir('/output/ssg', '/blog/my-post')
 * // '/output/ssg/blog/my-post'
 * 
 * pathToOutDir('/output/ssg', '/')
 * // '/output/ssg'
 */
export function pathToOutDir(baseDir: string, urlPath: string): string {
  const clean = urlPath === "/" ? "" : urlPath.replace(/^\/+/, "");
  return path.join(baseDir, clean);
}

