import fs from "fs";
import path from "path";
import { LoadedRoute, PageComponent } from "./index.types";
import { PAGE_FILE_REGEX } from "./constants";
import { buildRoutePathFromDir, buildRegexFromRoutePath } from "./path";
import { loadLayoutsForDir } from "./layout";
import { loadLoaderForDir } from "./loader";

/**
 * Scans the app directory and loads all page routes.
 * 
 * Recursively walks through the app directory, finding all `page.tsx`, `page.ts`,
 * `page.jsx`, or `page.js` files and creating route definitions.
 * 
 * @param appDir - Root directory of the app (e.g., 'app')
 * @returns Array of loaded routes with components, layouts, loaders, etc.
 * 
 * @example
 * const routes = loadRoutes('app');
 * // [
 * //   { pattern: '/', component: HomePage, layouts: [], ... },
 * //   { pattern: '/blog/[slug]', component: BlogPage, layouts: [RootLayout], ... },
 * // ]
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

      const { middlewares, loader, dynamic, generateStaticParams } =
        loadLoaderForDir(currentDir);

      routes.push({
        pattern: routePath,
        regex,
        paramNames,
        component,
        layouts,
        pageFile: fullPath,
        layoutFiles,
        middlewares,
        loader,
        dynamic,
        generateStaticParams,
      });
    }
  }

  walk(appDir);

  return routes;
}

