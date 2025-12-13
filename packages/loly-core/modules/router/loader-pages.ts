import fs from "fs";
import path from "path";
import { LoadedRoute, PageComponent } from "./index.types";
import { PAGE_FILE_REGEX } from "./constants";
import { buildRoutePathFromDir, buildRegexFromRoutePath } from "./path";
import { loadLayoutsForDir } from "./layout";
import { loadServerHookForDir, loadLayoutServerHook } from "./server-hook";

/**
 * Scans the app directory and loads all page routes.
 * Recursively walks through the app directory, finding all page files and creating route definitions.
 */
export function loadRoutes(appDir: string): LoadedRoute[] {
  if (!fs.existsSync(appDir)) {
    return [];
  }

  const routes: LoadedRoute[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!PAGE_FILE_REGEX.test(entry.name)) continue;

      // Skip special error pages - they're handled separately
      if (entry.name.startsWith("_not-found.") || entry.name.startsWith("_error.")) {
        continue;
      }

      const relDir = path.relative(appDir, currentDir);
      const routePath = buildRoutePathFromDir(relDir);
      const { regex, paramNames } = buildRegexFromRoutePath(routePath);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(fullPath);
      const component: PageComponent = mod.default;

      if (!component) {
        continue;
      }

      const { components: layouts, files: layoutFiles } = loadLayoutsForDir(
        currentDir,
        appDir
      );

      // Load server hooks for each layout (root → specific, same order as layouts)
      // For a layout at app/layout.tsx, we look for app/layout.server.hook.ts (same directory)
      const layoutServerHooks: (typeof serverHook)[] = [];
      for (const layoutFile of layoutFiles) {
        const layoutServerHook = loadLayoutServerHook(layoutFile);
        layoutServerHooks.push(layoutServerHook);
      }

      const { middlewares, serverHook, dynamic, generateStaticParams } =
        loadServerHookForDir(currentDir);

      routes.push({
        pattern: routePath,
        regex,
        paramNames,
        component,
        layouts,
        pageFile: fullPath,
        layoutFiles,
        middlewares,
        loader: serverHook, // Keep 'loader' field name for backward compatibility
        layoutServerHooks, // Server hooks for each layout (same order as layouts)
        dynamic,
        generateStaticParams,
      });
    }
  }

  walk(appDir);

  return routes;
}

