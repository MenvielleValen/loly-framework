import fs from "fs";
import path from "path";
import { ApiRoute } from "./index.types";
import {
  extractApiHandlers,
  extractApiMiddlewares,
  extractRouteRegex,
  loadModuleSafely,
} from "./helpers/routes";

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
export async function loadApiRoutes(appDir: string): Promise<ApiRoute[]> {
  const apiRoot = path.join(appDir, "api");
  const routes: ApiRoute[] = [];

  if (!fs.existsSync(apiRoot)) return routes;

  async function walk(currentDir: string): Promise<void> {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      // Only process route files
      if (!ROUTE_FILE_REGEX.test(entry.name)) continue;

      const relToApp = path.relative(appDir, fullPath).replace(/\\/g, "/");
      const withoutRoute = relToApp.replace(/\/route\.(ts|tsx|js|jsx)$/, "");
      const pattern = "/" + withoutRoute;

      const { regex, paramNames } = extractRouteRegex(pattern);

      const mod = await loadModuleSafely(fullPath, appDir);
      if (!mod) {
        continue;
      }

      const handlers = extractApiHandlers(mod, HTTP_METHODS);
      const { global: globalMiddlewares, methodSpecific: methodMiddlewares } =
        extractApiMiddlewares(mod, HTTP_METHODS);

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

  await walk(apiRoot);

  return routes;
}

