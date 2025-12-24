import fs from "fs";
import path from "path";
import {
  ApiHandler,
  ApiMiddleware,
  LayoutComponent,
  PageComponent,
  RoutesManifest,
} from "../../index.types";
import { buildRegexFromRoutePath } from "../../path";
import { BUILD_FOLDER_NAME } from "@constants/globals";

/**
 * Reads and parses the routes manifest file.
 */
export function readManifest(projectRoot: string): RoutesManifest | null {
  const manifestPath = path.join(
    projectRoot,
    BUILD_FOLDER_NAME,
    "routes-manifest.json"
  );

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as RoutesManifest;
}

/**
 * Safely loads a module with error handling.
 */
export async function loadModuleSafely(filePath: string, projectRoot?: string): Promise<any | null> {
  try {
    const { loadModule } = await import("../../utils/module-loader");
    return await loadModule(filePath, { projectRoot });
  } catch (err) {
    return null;
  }
}

/**
 * Loads and processes layout components from layout file paths.
 */
export async function loadLayouts(
  layoutFiles: string[],
  projectRoot: string
): Promise<LayoutComponent[]> {
  const layoutMods = layoutFiles.map((lf) => {
    const fullPath = path.join(projectRoot, lf);
    return loadModuleSafely(fullPath, projectRoot);
  });

  const resolved = await Promise.all(layoutMods);

  return resolved
    .filter((m): m is { default: LayoutComponent } => !!m?.default)
    .map((m) => m.default);
}

/**
 * Builds regex and extracts param names from a route pattern.
 */
export function extractRouteRegex(pattern: string, paramNames?: string[]) {
  const { regex, paramNames: extractedParamNames } =
    buildRegexFromRoutePath(pattern);
  return {
    regex,
    paramNames: paramNames ?? extractedParamNames,
  };
}

/**
 * Extracts HTTP method handlers from a module.
 */
export function extractApiHandlers(
  mod: any,
  methods: string[]
): Record<string, ApiHandler> {
  const handlers: Record<string, ApiHandler> = {};

  for (const method of methods) {
    if (typeof mod[method] === "function") {
      handlers[method] = mod[method] as ApiHandler;
    }
  }

  return handlers;
}

/**
 * Extracts global and method-specific middlewares from a module.
 */
export function extractApiMiddlewares(
  mod: any,
  methods: string[]
): {
  global: ApiMiddleware[];
  methodSpecific: Record<string, ApiMiddleware[]>;
} {
  const globalMiddlewares: ApiMiddleware[] = Array.isArray(mod.beforeApi)
    ? mod.beforeApi
    : [];

  const methodMiddlewares: Record<string, ApiMiddleware[]> = {};

  for (const method of methods) {
    const key = `before${method}`;
    const mws = mod[key];
    if (Array.isArray(mws)) {
      methodMiddlewares[method] = mws as ApiMiddleware[];
    }
  }

  return {
    global: globalMiddlewares,
    methodSpecific: methodMiddlewares,
  };
}

/**
 * Extracts WebSocket event handlers from a module.
 */
export function extractWssHandlers(
  mod: any,
  events: string[]
): Record<string, ApiHandler> {
  const handlers: Record<string, ApiHandler> = {};

  if (!Array.isArray(mod.events)) {
    return handlers;
  }

  for (const eventName of events) {
    if (typeof eventName === "string") {
      const event = mod.events.find(
        (e: { name: string }) => e.name?.toLowerCase() === eventName.toLowerCase()
      );
      if (event?.handler) {
        handlers[eventName] = event.handler as ApiHandler;
      }
    }
  }

  return handlers;
}

/**
 * Extracts all WebSocket event handlers directly from a module's events array.
 * This is used when scanning filesystem routes where we iterate over all events.
 */
export function extractWssHandlersFromModule(mod: any): Record<string, ApiHandler> {
  const handlers: Record<string, ApiHandler> = {};

  if (!Array.isArray(mod?.events)) {
    return handlers;
  }

  for (const event of mod.events) {
    if (typeof event.handler === "function" && typeof event.name === "string") {
      handlers[event.name.toLowerCase()] = event.handler as ApiHandler;
    }
  }

  return handlers;
}

/**
 * Loads a page component from a file path.
 */
export async function loadPageComponent(
  pageFile: string,
  projectRoot: string
): Promise<PageComponent | null> {
  const fullPath = path.join(projectRoot, pageFile);
  const pageMod = await loadModuleSafely(fullPath, projectRoot);
  return pageMod?.default || null;
}

// Export WSS route extractor
export { extractDefineWssRoute, type NormalizedWssRoute } from "./extract-wss-route";

