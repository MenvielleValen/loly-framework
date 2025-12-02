import fs from "fs";
import path from "path";
import { ApiHandler, ApiMiddleware, WssRoute } from "./index.types";
import { buildRegexFromRoutePath } from "./path";

const ROUTE_FILE_REGEX = /events\.(ts|tsx|js|jsx)$/;

export function loadWssRoutes(appDir: string): WssRoute[] {
  const apiRoot = path.join(appDir, "wss");
  const routes: WssRoute[] = [];

  console.log({apiRoot});

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

      const { regex, paramNames } = buildRegexFromRoutePath(pattern);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(fullPath);

      const handlers: Record<string, ApiHandler> = {};
      const methodMiddlewares: Record<string, ApiMiddleware[]> = {};

      for (const m of (mod?.events || [])) {
        if(typeof m.handler === "function" && typeof m.name === "string") {
          handlers[m.name.toLowerCase()] = m.handler as ApiHandler;
        }
      }

      const globalMiddlewares: ApiMiddleware[] = Array.isArray(mod.beforeApi)
        ? mod.beforeApi
        : [];

        /*
      for (const m of HTTP_METHODS) {
        const key = `before${m}`;
        const mws = (mod as any)[key];
        if (Array.isArray(mws)) {
          methodMiddlewares[m] = mws as ApiMiddleware[];
        }
      }*/

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

