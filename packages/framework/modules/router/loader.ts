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
  const loaderTs = path.join(currentDir, `${NAMING.SERVER_HOOK}.ts`);
  const loaderJs = path.join(currentDir, `${NAMING.SERVER_HOOK}.js`);

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

  const middlewares: RouteMiddleware[] = Array.isArray(
    mod?.[NAMING.BEFORE_MIDDLEWARES]
  )
    ? mod[NAMING.BEFORE_MIDDLEWARES]
    : [];

  const loader: ServerLoader | null =
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
    loader,
    dynamic,
    generateStaticParams,
  };
}
