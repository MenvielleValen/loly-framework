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
export async function loadServerHookForDir(currentDir: string): Promise<{
  middlewares: RouteMiddleware[];
  serverHook: ServerLoader | null;
  dynamic: DynamicMode;
  generateStaticParams: GenerateStaticParams | null;
}> {
  // Determine if we're in production (compiled) or dev (source)
  const isDev = process.env.NODE_ENV === "development";
  const isBuild = process.env.LOLY_BUILD === "1";
  
  let file: string | null = null;
  
  // Check if we're in a compiled directory (.loly/server)
  const isCompiledDir = currentDir.includes(".loly") && currentDir.includes("server");
  
  if (isCompiledDir || (!isDev && !isBuild)) {
    // Production: always look for .mjs files (ESM only)
    // Try page.server.hook first (preferred)
    const pageServerHookMjs = path.join(currentDir, `page.server.hook.mjs`);
    const pageServerHookJs = path.join(currentDir, `page.server.hook.js`);
    
    // Fallback to server.hook (legacy)
    const serverHookMjs = path.join(currentDir, `${NAMING.SERVER_HOOK}.mjs`);
    const serverHookJs = path.join(currentDir, `${NAMING.SERVER_HOOK}.js`);
    
    file = fs.existsSync(pageServerHookMjs)
      ? pageServerHookMjs
      : fs.existsSync(pageServerHookJs)
      ? pageServerHookJs
      : fs.existsSync(serverHookMjs)
      ? serverHookMjs
      : fs.existsSync(serverHookJs)
      ? serverHookJs
      : null;
  } else {
    // Development: look for .ts files
    const pageServerHookTs = path.join(currentDir, `page.server.hook.ts`);
    const pageServerHookJs = path.join(currentDir, `page.server.hook.js`);
    
    // Fallback to server.hook.ts (legacy, backward compatibility)
    const serverHookTs = path.join(currentDir, `${NAMING.SERVER_HOOK}.ts`);
    const serverHookJs = path.join(currentDir, `${NAMING.SERVER_HOOK}.js`);

    file = fs.existsSync(pageServerHookTs)
      ? pageServerHookTs
      : fs.existsSync(pageServerHookJs)
      ? pageServerHookJs
      : fs.existsSync(serverHookTs)
      ? serverHookTs
      : fs.existsSync(serverHookJs)
      ? serverHookJs
      : null;
  }

  if (!file) {
    return {
      middlewares: [],
      serverHook: null,
      dynamic: "auto",
      generateStaticParams: null,
    };
  }

  let mod: any;
  try {
    const { loadModule } = await import("./utils/module-loader");
    mod = await loadModule(file, { projectRoot: currentDir });
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
 * Loads server hook and middlewares for a specific layout file.
 * Looks for layout.server.hook.ts in the same directory as the layout file.
 * 
 * @param layoutFile - Full path to the layout file (e.g., app/layout.tsx)
 * @returns Object with server hook and middlewares, or null if not found
 * 
 * @example
 * // app/layout.tsx → looks for app/layout.server.hook.ts
 * // app/blog/layout.tsx → looks for app/blog/layout.server.hook.ts
 * 
 * // In layout.server.hook.ts:
 * export const beforeServerData: RouteMiddleware[] = [
 *   async (ctx, next) => {
 *     ctx.locals.layoutData = { theme: 'dark' };
 *     await next();
 *   }
 * ];
 * export const getServerSideProps: ServerLoader = async (ctx) => {
 *   return { props: { theme: ctx.locals.layoutData?.theme } };
 * };
 */
export async function loadLayoutServerHook(layoutFile: string): Promise<{
  serverHook: ServerLoader | null;
  middlewares: RouteMiddleware[];
} | null> {
  const layoutDir = path.dirname(layoutFile);
  const layoutExt = path.extname(layoutFile); // .tsx, .ts, .jsx, .js, .mjs, .cjs
  const layoutBasename = path.basename(layoutFile, layoutExt); // "layout" without extension
  
  // Determine if we're in production (compiled) or dev (source)
  const isDev = process.env.NODE_ENV === "development";
  const isBuild = process.env.LOLY_BUILD === "1";
  
  let file: string | null = null;
  
  // If layoutFile is already compiled (.mjs), look for compiled hook
  if (layoutExt === ".mjs") {
    // Production: layout file is compiled, so hook should be too (always .mjs for ESM)
    const serverHookMjs = path.join(layoutDir, `${layoutBasename}.server.hook.mjs`);
    const serverHookJs = path.join(layoutDir, `${layoutBasename}.server.hook.js`);
    file = fs.existsSync(serverHookMjs) 
      ? serverHookMjs 
      : (fs.existsSync(serverHookJs) ? serverHookJs : null);
  } else if (isDev && !isBuild) {
    // Development: look for .ts files
    const serverHookTs = path.join(layoutDir, `${layoutBasename}.server.hook.ts`);
    const serverHookJs = path.join(layoutDir, `${layoutBasename}.server.hook.js`);
    file = fs.existsSync(serverHookTs) ? serverHookTs : (fs.existsSync(serverHookJs) ? serverHookJs : null);
  } else {
    // Build time or production: always look for .mjs (ESM only)
    const serverHookMjs = path.join(layoutDir, `${layoutBasename}.server.hook.mjs`);
    const serverHookTs = path.join(layoutDir, `${layoutBasename}.server.hook.ts`);
    const serverHookJs = path.join(layoutDir, `${layoutBasename}.server.hook.js`);
    
    file = fs.existsSync(serverHookMjs) 
      ? serverHookMjs 
      : (fs.existsSync(serverHookTs) ? serverHookTs : (fs.existsSync(serverHookJs) ? serverHookJs : null));
  }

  if (!file) {
    return null;
  }

  try {
    const { loadModule } = await import("./utils/module-loader");
    const mod = await loadModule(file, { projectRoot: path.dirname(file) });
    
    const serverHook: ServerLoader | null =
      typeof mod?.getServerSideProps === "function"
        ? mod.getServerSideProps
        : null;
    
    // Load middlewares from layout.server.hook.ts (same name as page middlewares: beforeServerData)
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
    
    return {
      serverHook,
      middlewares,
    };
  } catch (error) {
    console.error(
      `[framework][server-hook] Error loading layout server hook from ${file}:`,
      error
    );
    return null;
  }
}
