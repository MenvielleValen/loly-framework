import fs from "fs";
import path from "path";
import { WssRoute } from "./index.types";
import {
  extractApiMiddlewares,
  extractRouteRegex,
  loadModuleSafely,
  extractDefineWssRoute,
  type NormalizedWssRoute,
} from "./helpers/routes";

const ROUTE_FILE_REGEX = /events\.(ts|tsx|js|jsx)$/;

/**
 * Extended WssRoute with normalized route definition.
 */
export interface ExtendedWssRoute extends WssRoute {
  normalized?: NormalizedWssRoute;
}

/**
 * Loads WSS routes from the filesystem.
 * Only supports the new defineWssRoute() format.
 * 
 * @param appDir - Application directory
 * @returns Array of WSS routes
 */
export function loadWssRoutes(appDir: string): ExtendedWssRoute[] {
  const apiRoot = path.join(appDir, "wss");
  const routes: ExtendedWssRoute[] = [];

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

      const relToApp = path.relative(appDir, fullPath).replace(/\\/g, "/");
      const withoutRoute = relToApp.replace(/\/events\.(ts|tsx|js|jsx)$/, "");
      const pattern = "/" + withoutRoute;

      const { regex, paramNames } = extractRouteRegex(pattern);

      const mod = loadModuleSafely(fullPath);
      if (!mod) {
        continue;
      }

      // Extract namespace from pattern (remove /wss prefix if present)
      let namespace = pattern.replace(/^\/wss/, "");
      if (!namespace.startsWith("/")) {
        namespace = "/" + namespace;
      }
      if (namespace === "") {
        namespace = "/";
      }

      // Try to extract new format route
      let normalized: NormalizedWssRoute | null = null;
      try {
        normalized = extractDefineWssRoute(mod, namespace);
      } catch (error) {
        // Error already has helpful message, but we need to handle it
        console.error(error instanceof Error ? error.message : String(error));
        continue; // Skip this route
      }

      if (!normalized) {
        // No valid route definition found
        console.warn(
          `[loly:realtime] Skipping route at ${fullPath}: ` +
          "No default export from defineWssRoute() found"
        );
        continue;
      }

      // Convert normalized events to legacy handlers format for backwards compatibility
      // (This will be removed when we refactor setupWssEvents)
      const handlers: Record<string, any> = {};
      for (const [eventName, eventDef] of normalized.events.entries()) {
        handlers[eventName] = eventDef.handler;
      }

      const { global: globalMiddlewares, methodSpecific: methodMiddlewares } =
        extractApiMiddlewares(mod, []);

      routes.push({
        pattern,
        regex,
        paramNames,
        handlers,
        middlewares: globalMiddlewares,
        methodMiddlewares,
        filePath: fullPath,
        normalized, // Store normalized structure
      });
    }
  }

  walk(apiRoot);

  return routes;
}

