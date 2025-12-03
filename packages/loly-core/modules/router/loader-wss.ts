import fs from "fs";
import path from "path";
import { WssRoute } from "./index.types";
import {
  extractApiMiddlewares,
  extractRouteRegex,
  extractWssHandlersFromModule,
  loadModuleSafely,
} from "./helpers/routes";

const ROUTE_FILE_REGEX = /events\.(ts|tsx|js|jsx)$/;

export function loadWssRoutes(appDir: string): WssRoute[] {
  const apiRoot = path.join(appDir, "wss");
  const routes: WssRoute[] = [];

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

      const handlers = extractWssHandlersFromModule(mod);
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
      });
    }
  }

  walk(apiRoot);

  return routes;
}

