import { GlobalMiddleware, ServerContext } from "@router/index";
import path from "path";
import fs from "fs";

let cachedGlobalMiddlewares: GlobalMiddleware[] | null = null;

/**
 * Loads global middlewares from global.middleware.ts file in project root.
 * Caches the result to avoid loading multiple times.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Array of global middlewares, or empty array if file doesn't exist
 */
export async function loadGlobalMiddlewares(projectRoot: string): Promise<GlobalMiddleware[]> {
  // Return cached middlewares if already loaded
  if (cachedGlobalMiddlewares !== null) {
    return cachedGlobalMiddlewares;
  }

  const globalMiddlewareFile = path.join(projectRoot, "global.middleware.ts");
  const globalMiddlewareFileJs = path.join(projectRoot, "global.middleware.js");
  
  const file = fs.existsSync(globalMiddlewareFile)
    ? globalMiddlewareFile
    : fs.existsSync(globalMiddlewareFileJs)
    ? globalMiddlewareFileJs
    : null;

  if (!file) {
    cachedGlobalMiddlewares = [];
    return cachedGlobalMiddlewares;
  }

  if (file.endsWith(".ts") || file.endsWith(".tsx")) {
    try {
      require("tsx/cjs");
    } catch (e) {
      // tsx might already be loaded
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file);
    const middlewares = mod?.globalMiddlewares;
    
    if (Array.isArray(middlewares)) {
      const validMiddlewares: GlobalMiddleware[] = [];
      for (let i = 0; i < middlewares.length; i++) {
        const mw = middlewares[i];
        if (typeof mw === "function") {
          validMiddlewares.push(mw);
        } else {
          console.warn(
            `[framework][global-middleware] Middleware at index ${i} in global.middleware.ts is not a function, skipping`
          );
        }
      }
      
      cachedGlobalMiddlewares = validMiddlewares;
      return cachedGlobalMiddlewares;
    } else if (middlewares !== undefined) {
      console.warn(
        "[framework][global-middleware] globalMiddlewares must be an array in global.middleware.ts, ignoring invalid value"
      );
    }
  } catch (error) {
    console.error("[framework][global-middleware] Error loading global.middleware.ts:", error);
  }

  // On error, cache empty array to avoid retrying
  cachedGlobalMiddlewares = [];
  return cachedGlobalMiddlewares;
}

/**
 * Executes global middlewares in order.
 * Stops execution if response is sent (e.g., redirect).
 * 
 * @param ctx - Server context
 * @param globalMiddlewares - Array of global middlewares to execute
 */
export async function runGlobalMiddlewares(
  ctx: ServerContext,
  globalMiddlewares: GlobalMiddleware[]
): Promise<void> {
  for (const mw of globalMiddlewares) {
    try {
      await Promise.resolve(mw(ctx, async () => {}));
    } catch (error) {
      console.error("[framework][global-middleware] Error in global middleware:", error);
      continue;
    }
    
    if (ctx.res.headersSent) {
      return;
    }
  }
}

