import fs from "fs";
import path from "path";
import {
  DynamicMode,
  GenerateStaticParams,
  RouteMiddleware,
  ServerLoader,
} from "./index.types";

/**
 * Loads server-side hooks (loader, middlewares, SSG config) from a directory.
 * 
 * Looks for `server.hook.ts` or `server.hook.js` in the given directory.
 * 
 * @param currentDir - Directory to search for server hook file
 * @returns Object containing middlewares, loader, dynamic mode, and generateStaticParams
 * 
 * @example
 * // app/blog/[slug]/server.hook.ts
 * export const beforeServerData = [authMiddleware];
 * export const getServerSideProps = async (ctx) => ({ props: {} });
 * export const dynamic = "force-static";
 * export const generateStaticParams = async () => [{ slug: "post-1" }];
 */
export function loadLoaderForDir(currentDir: string): {
  middlewares: RouteMiddleware[];
  loader: ServerLoader | null;
  dynamic: DynamicMode;
  generateStaticParams: GenerateStaticParams | null;
} {
  const loaderTs = path.join(currentDir, "server.hook.ts");
  const loaderJs = path.join(currentDir, "server.hook.js");

  const file = fs.existsSync(loaderTs)
    ? loaderTs
    : fs.existsSync(loaderJs)
    ? loaderJs
    : null;

  if (!file) {
    return {
      middlewares: [],
      loader: null,
      dynamic: "auto",
      generateStaticParams: null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(file);

  const middlewares: RouteMiddleware[] = Array.isArray(mod.beforeServerData)
    ? mod.beforeServerData
    : [];

  const loader: ServerLoader | null =
    typeof mod.getServerSideProps === "function"
      ? mod.getServerSideProps
      : null;

  const dynamic: DynamicMode =
    mod.dynamic === "force-static" || mod.dynamic === "force-dynamic"
      ? mod.dynamic
      : "auto";

  const generateStaticParams: GenerateStaticParams | null =
    typeof mod.generateStaticParams === "function"
      ? mod.generateStaticParams
      : null;

  return {
    middlewares,
    loader,
    dynamic,
    generateStaticParams,
  };
}

