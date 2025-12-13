import fs from "fs";
import path from "path";
import {
  DynamicMode,
  GenerateStaticParams,
  RouteMiddleware,
  ServerLoader,
} from "./index.types";

const NAMING = {
  // Constants & Fns
  BEFORE_MIDDLEWARES: "beforeServerData",
  GET_SERVER_DATA_FN: "getServerSideProps",
  GENERATE_SSG_PARAMS: "generateStaticParams",
  RENDER_TYPE_CONST: "dynamic",

  // Files
  SERVER_HOOK: 'server.hook',
};

/**
 * Loads server-side hooks from a directory.
 * The server hook file contains getServerSideProps, middlewares, SSG config, etc.
 *
 * Looks for server hook files in this order:
 * 1. `page.server.hook.ts` (preferred, consistent with layout.server.hook.ts)
 * 2. `server.hook.ts` (legacy, for backward compatibility)
 *
 * @param currentDir - Directory to search for server hook file
 * @returns Object containing middlewares, serverHook, dynamic mode, and generateStaticParams
 *
 * @example
 * // app/blog/[slug]/page.server.hook.ts (preferred)
 * // app/blog/[slug]/server.hook.ts (legacy, still works)
 * export const beforeServerData = [authMiddleware];
 * export const getServerSideProps = async (ctx) => ({ props: {} });
 * export const dynamic = "force-static";
 * export const generateStaticParams = async () => [{ slug: "post-1" }];
 */
export function loadServerHookForDir(currentDir: string): {
  middlewares: RouteMiddleware[];
  serverHook: ServerLoader | null;
  dynamic: DynamicMode;
  generateStaticParams: GenerateStaticParams | null;
} {
  // Try page.server.hook.ts first (preferred, consistent with layout.server.hook.ts)
  const pageServerHookTs = path.join(currentDir, `page.server.hook.ts`);
  const pageServerHookJs = path.join(currentDir, `page.server.hook.js`);
  
  // Fallback to server.hook.ts (legacy, backward compatibility)
  const serverHookTs = path.join(currentDir, `${NAMING.SERVER_HOOK}.ts`);
  const serverHookJs = path.join(currentDir, `${NAMING.SERVER_HOOK}.js`);

  const file = fs.existsSync(pageServerHookTs)
    ? pageServerHookTs
    : fs.existsSync(pageServerHookJs)
    ? pageServerHookJs
    : fs.existsSync(serverHookTs)
    ? serverHookTs
    : fs.existsSync(serverHookJs)
    ? serverHookJs
    : null;

  if (!file) {
    return {
      middlewares: [],
      serverHook: null,
      dynamic: "auto",
      generateStaticParams: null,
    };
  }

  // Ensure tsx is loaded for TypeScript files during build
  // tsx automatically reads tsconfig.json from the project root to resolve path aliases
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    try {
      // Load tsx if not already loaded - it will handle TypeScript compilation and path resolution
      require('tsx/cjs');
    } catch (e) {
      // tsx might already be loaded, ignore error
    }
  }

  let mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require(file);
  } catch (error) {
    console.error(
      `[framework][server-hook] Error loading server hook from ${file}:`,
      error
    );
    // Return defaults if module fails to load
    return {
      middlewares: [],
      serverHook: null,
      dynamic: "auto",
      generateStaticParams: null,
    };
  }

  // Load and validate middlewares
  let middlewares: RouteMiddleware[] = [];
  const rawMiddlewares = mod?.[NAMING.BEFORE_MIDDLEWARES];
  
  if (rawMiddlewares !== undefined) {
    if (!Array.isArray(rawMiddlewares)) {
      console.warn(
        `[framework][server-hook] ${NAMING.BEFORE_MIDDLEWARES} must be an array in ${file}, ignoring invalid value`
      );
    } else {
      // Validate each middleware is a function
      for (let i = 0; i < rawMiddlewares.length; i++) {
        const mw = rawMiddlewares[i];
        if (typeof mw !== "function") {
          console.warn(
            `[framework][server-hook] Middleware at index ${i} in ${NAMING.BEFORE_MIDDLEWARES} is not a function in ${file}, skipping`
          );
          continue;
        }
        middlewares.push(mw);
      }
    }
  }

  const serverHook: ServerLoader | null =
    typeof mod?.[NAMING.GET_SERVER_DATA_FN] === "function"
      ? mod[NAMING.GET_SERVER_DATA_FN]
      : null;

  const dynamic: DynamicMode =
    mod?.[NAMING.RENDER_TYPE_CONST] === "force-static" ||
    mod?.[NAMING.RENDER_TYPE_CONST] === "force-dynamic"
      ? mod.dynamic
      : "auto";

  const generateStaticParams: GenerateStaticParams | null =
    typeof mod?.[NAMING.GENERATE_SSG_PARAMS] === "function"
      ? mod[NAMING.GENERATE_SSG_PARAMS]
      : null;

  return {
    middlewares,
    serverHook,
    dynamic,
    generateStaticParams,
  };
}

/**
 * Loads server hook for a specific layout file.
 * Looks for layout.server.hook.ts in the same directory as the layout file.
 * 
 * @param layoutFile - Full path to the layout file (e.g., app/layout.tsx)
 * @returns Server hook for the layout, or null if not found
 * 
 * @example
 * // app/layout.tsx → looks for app/layout.server.hook.ts
 * // app/blog/layout.tsx → looks for app/blog/layout.server.hook.ts
 */
export function loadLayoutServerHook(layoutFile: string): ServerLoader | null {
  const layoutDir = path.dirname(layoutFile);
  const layoutBasename = path.basename(layoutFile, path.extname(layoutFile)); // "layout" without extension
  
  // Look for layout.server.hook.ts in the same directory
  const serverHookTs = path.join(layoutDir, `${layoutBasename}.server.hook.ts`);
  const serverHookJs = path.join(layoutDir, `${layoutBasename}.server.hook.js`);
  
  const file = fs.existsSync(serverHookTs)
    ? serverHookTs
    : fs.existsSync(serverHookJs)
    ? serverHookJs
    : null;

  if (!file) {
    return null;
  }

  // Ensure tsx is loaded for TypeScript files
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    try {
      require('tsx/cjs');
    } catch (e) {
      // tsx might already be loaded, ignore error
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file);
    const serverHook: ServerLoader | null =
      typeof mod?.getServerSideProps === "function"
        ? mod.getServerSideProps
        : null;
    return serverHook;
  } catch (error) {
    console.error(
      `[framework][server-hook] Error loading layout server hook from ${file}:`,
      error
    );
    return null;
  }
}
