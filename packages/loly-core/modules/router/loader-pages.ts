import fs from "fs";
import path from "path";
import { LoadedRoute, PageComponent, RouteMiddleware } from "./index.types";
import { PAGE_FILE_REGEX } from "./constants";
import { buildRoutePathFromDir, buildRegexFromRoutePath, isRouteGroup } from "./path";
import { loadLayoutsForDir } from "./layout";
import { loadServerHookForDir, loadLayoutServerHook } from "./server-hook";

/**
 * Validates loaded routes and warns about common issues.
 * Detects duplicate route patterns, including those that result from ignoring route groups.
 */
function validateRoutes(routes: LoadedRoute[], appDir: string): void {
  const routePatterns = new Map<string, LoadedRoute[]>();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate route patterns
  // This will catch conflicts from route groups (e.g., app/(dashboard)/settings and app/settings)
  for (const route of routes) {
    const existing = routePatterns.get(route.pattern) || [];
    existing.push(route);
    routePatterns.set(route.pattern, existing);
  }

  for (const [pattern, duplicateRoutes] of routePatterns.entries()) {
    if (duplicateRoutes.length > 1) {
      const files = duplicateRoutes.map(r => {
        const relPath = r.pageFile ? path.relative(appDir, r.pageFile) : 'unknown';
        // Check if the route is inside a route group
        const segments = relPath.split(path.sep);
        const hasRouteGroup = segments.some(seg => isRouteGroup(seg));
        return hasRouteGroup ? `${relPath} (inside route group)` : relPath;
      }).join(', ');
      
      errors.push(
        `Duplicate route pattern "${pattern}" found in multiple files:\n` +
        `  ${files}\n` +
        `  💡 Suggestion: Route groups (directories in parentheses) don't appear in URLs.\n` +
        `     Ensure each route has a unique path pattern after route groups are ignored.`
      );
    }
  }

  // Check for routes with missing page files
  for (const route of routes) {
    if (!route.pageFile || !fs.existsSync(route.pageFile)) {
      warnings.push(
        `Route pattern "${route.pattern}" references a missing page file`
      );
    }
  }

  // Report errors (fatal)
  if (errors.length > 0) {
    const errorMessage = [
      '❌ Route validation failed:',
      '',
      ...errors,
      '',
      '💡 Please fix the errors above before starting the server.',
    ].join('\n');
    throw new Error(errorMessage);
  }

  // Report warnings (non-fatal, but informative)
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('\n⚠️  Route warnings:');
    warnings.forEach(warning => console.warn(`  • ${warning}`));
    console.warn('');
  }
}

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

      // Load server hooks and middlewares for each layout (root → specific, same order as layouts)
      // For a layout at app/layout.tsx, we look for app/layout.server.hook.ts (same directory)
      const layoutServerHooks: (typeof serverHook)[] = [];
      const layoutMiddlewares: RouteMiddleware[][] = [];
      for (const layoutFile of layoutFiles) {
        const layoutHookData = loadLayoutServerHook(layoutFile);
        if (layoutHookData) {
          layoutServerHooks.push(layoutHookData.serverHook);
          layoutMiddlewares.push(layoutHookData.middlewares);
        } else {
          layoutServerHooks.push(null);
          layoutMiddlewares.push([]);
        }
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
        layoutMiddlewares, // Middlewares for each layout (same order as layouts)
        dynamic,
        generateStaticParams,
      });
    }
  }

  walk(appDir);

  // Validate routes and report issues
  validateRoutes(routes, appDir);

  return routes;
}

