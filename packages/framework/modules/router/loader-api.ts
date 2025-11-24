import fs from "fs";
import path from "path";
import { ApiHandler, ApiMiddleware, ApiRoute } from "./index.types";
import { buildRegexFromRoutePath } from "./path";

const ROUTE_FILE_REGEX = /route\.(ts|tsx|js|jsx)$/;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

/**
 * Scans the app/api directory and loads all API routes.
 * 
 * Recursively walks through the app/api directory, finding all `route.ts`, `route.tsx`,
 * `route.js`, or `route.jsx` files and creating API route definitions.
 * 
 * @param appDir - Root directory of the app (e.g., 'app')
 * @returns Array of loaded API routes with handlers and middlewares
 * 
 * @example
 * const apiRoutes = loadApiRoutes('app');
 * // [
 * //   {
 * //     pattern: '/api/posts/[id]',
 * //     handlers: { GET: getPost, POST: updatePost },
 * //     middlewares: [authMiddleware],
 * //     methodMiddlewares: { GET: [logMiddleware] },
 * //   },
 * // ]
 */
export function loadApiRoutes(appDir: string): ApiRoute[] {
  const apiRoot = path.join(appDir, "api");
  const routes: ApiRoute[] = [];

  if (!fs.existsSync(apiRoot)) return routes;

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      // Only process route files
      if (!ROUTE_FILE_REGEX.test(entry.name)) continue;

      // Build route pattern from file path
      const relToApp = path.relative(appDir, fullPath).replace(/\\/g, "/");
      // e.g., "api/posts/[id]/route.ts"
      const withoutRoute = relToApp.replace(/\/route\.(ts|tsx|js|jsx)$/, ""); // "api/posts/[id]"
      const pattern = "/" + withoutRoute; // "/api/posts/[id]"

      const { regex, paramNames } = buildRegexFromRoutePath(pattern);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(fullPath);

      const handlers: Record<string, ApiHandler> = {};
      const methodMiddlewares: Record<string, ApiMiddleware[]> = {};

      // Load handlers for each HTTP method
      for (const m of HTTP_METHODS) {
        if (typeof mod[m] === "function") {
          handlers[m] = mod[m] as ApiHandler;
        }
      }

      // Load global middlewares (apply to all methods)
      const globalMiddlewares: ApiMiddleware[] = Array.isArray(mod.beforeApi)
        ? mod.beforeApi
        : [];

      // Load method-specific middlewares (beforeGET, beforePOST, etc.)
      for (const m of HTTP_METHODS) {
        const key = `before${m}`; // e.g., "beforeGET"
        const mws = (mod as any)[key];
        if (Array.isArray(mws)) {
          methodMiddlewares[m] = mws as ApiMiddleware[];
        }
      }

      routes.push({
        pattern,
        regex,
        paramNames,
        handlers,
        middlewares: globalMiddlewares,
        methodMiddlewares,
        filePath: fullPath,
      });
    }
  }

  walk(apiRoot);

  if (routes.length > 0) {
    console.log("[framework] Loaded API routes:");
    for (const r of routes) {
      console.log(
        `  ${r.pattern}  (methods: ${Object.keys(r.handlers).join(
          ", "
        )}, middlewares: ${r.middlewares.length})`
      );
    }
  }

  return routes;
}

