import fs from "fs";
import path from "path";
import {
  ApiRoute,
  ApiRouteManifestEntry,
  LoadedRoute,
  PageRouteManifestEntry,
  RoutesManifest,
  WssRoute,
  WssRouteManifestEntry,
} from "./index.types";
import {
  BUILD_FOLDER_NAME,
  STYLE_FILE_NAME,
  NOT_FOUND_FILE_PREFIX,
  ERROR_FILE_PREFIX,
  NOT_FOUND_CHUNK_KEY,
  ERROR_CHUNK_KEY,
  NOT_FOUND_PATTERN,
  ERROR_PATTERN,
} from "@constants/globals";

/**
 * Writes the client-side routes manifest file.
 *
 * Generates a TypeScript file that exports route definitions with lazy-loaded
 * components for code splitting. The manifest is used by the client runtime
 * to handle client-side navigation.
 *
 * @param routes - Array of loaded routes
 * @param projectRoot - Root directory of the project
 * @param errorRoute - Optional error route for client-side error handling
 */
export function writeClientRoutesManifest(
  routes: LoadedRoute[],
  projectRoot: string
): void {
  const fwDir = path.join(projectRoot, BUILD_FOLDER_NAME);
  if (!fs.existsSync(fwDir)) {
    fs.mkdirSync(fwDir, { recursive: true });
  }

  const manifestPath = path.join(fwDir, "routes-client.ts");
  const manifestDir = path.dirname(manifestPath);

  function toImportPath(filePath: string): string {
    const relRaw = path.relative(manifestDir, filePath).replace(/\\/g, "/");
    const rel = relRaw.startsWith(".") ? relRaw : "./" + relRaw;
    // Remove extension so bundler can resolve .tsx, .ts, .jsx, .js
    return rel.replace(/\.(tsx|ts|jsx|js)$/, "");
  }

  function findUserNotFound(): string | null {
    const candidates = [
      `app/${NOT_FOUND_FILE_PREFIX}.tsx`,
      `app/${NOT_FOUND_FILE_PREFIX}.ts`,
      `app/${NOT_FOUND_FILE_PREFIX}.jsx`,
      `app/${NOT_FOUND_FILE_PREFIX}.js`,
      // Fallback to old style for backward compatibility
      "app/not-found/page.tsx",
      "app/not-found/page.ts",
      "app/not-found/page.jsx",
      "app/not-found/page.js",
    ];

    for (const rel of candidates) {
      const full = path.join(projectRoot, rel);
      if (fs.existsSync(full)) return full;
    }
    return null;
  }

  function findUserError(): string | null {
    const candidates = [
      `app/${ERROR_FILE_PREFIX}.tsx`,
      `app/${ERROR_FILE_PREFIX}.ts`,
      `app/${ERROR_FILE_PREFIX}.jsx`,
      `app/${ERROR_FILE_PREFIX}.js`,
    ];

    for (const rel of candidates) {
      const full = path.join(projectRoot, rel);
      if (fs.existsSync(full)) return full;
    }
    return null;
  }

  function findRootLayout(): string | null {
    const candidates = [
      "app/layout.tsx",
      "app/layout.ts",
      "app/layout.jsx",
      "app/layout.js",
    ];

    for (const rel of candidates) {
      const full = path.join(projectRoot, rel);
      if (fs.existsSync(full)) return full;
    }
    return null;
  }

  const lines: string[] = [];
  const chunkMap: Record<string, string> = {};

  lines.push(`import React from "react";`);
  lines.push("");

  lines.push(`export interface ClientLoadedComponents {`);
  lines.push(`  Page: React.ComponentType<any>;`);
  lines.push(`  layouts: React.ComponentType<any>[];`);
  lines.push(`}`);
  lines.push("");

  lines.push(`export interface ClientRouteLoaded {`);
  lines.push(`  pattern: string;`);
  lines.push(`  paramNames: string[];`);
  lines.push(`  load: () => Promise<ClientLoadedComponents>;`);
  lines.push(`}`);
  lines.push("");

  // --- rutas normales ---
  lines.push(`export const routes: ClientRouteLoaded[] = [`);

  for (const route of routes) {
    const pattern = route.pattern;
    const paramNames = route.paramNames;

    const modulePaths = [route.pageFile, ...route.layoutFiles].map(
      toImportPath
    );

    const safeName =
      pattern.replace(/^\//, "").replace(/\//g, "_").replace(/\[|\]/g, "") ||
      "root";

    const chunkName = `route-${safeName}`;
    chunkMap[pattern] = chunkName;

    lines.push("  {");
    lines.push(`    pattern: ${JSON.stringify(pattern)},`);
    lines.push(`    paramNames: ${JSON.stringify(paramNames)},`);
    lines.push(`    load: async () => {`);
    lines.push(`      const mods = await Promise.all([`);

    for (const p of modulePaths) {
      lines.push(
        `        import(/* webpackChunkName: "${chunkName}" */ "${p}"),`
      );
    }

    lines.push("      ]);");
    lines.push("      const [pageMod, ...layoutMods] = mods;");
    lines.push("      return {");
    lines.push("        Page: pageMod.default,");
    lines.push("        layouts: layoutMods.map((m) => m.default),");
    lines.push("      };");
    lines.push("    },");
    lines.push("  },");
  }

  lines.push("];");
  lines.push("");

  const notFoundPath = findUserNotFound();
  const errorPath = findUserError();
  const rootLayoutPath = findRootLayout();

  if (notFoundPath) {
    const notFoundImportPath = toImportPath(notFoundPath);
    const chunkName = "route-not-found";

    lines.push(`export const notFoundRoute: ClientRouteLoaded = {`);
    lines.push(`  pattern: "${NOT_FOUND_CHUNK_KEY}",`);
    lines.push(`  paramNames: [],`);
    lines.push(`  load: async () => {`);
    lines.push(`    const mods = await Promise.all([`);
    lines.push(
      `      import(/* webpackChunkName: "${chunkName}" */ "${notFoundImportPath}"),`
    );

    if (rootLayoutPath) {
      const rootLayoutImportPath = toImportPath(rootLayoutPath);
      lines.push(
        `      import(/* webpackChunkName: "${chunkName}" */ "${rootLayoutImportPath}"),`
      );
    }

    lines.push(`    ]);`);
    lines.push(`    const [pageMod, ...layoutMods] = mods;`);
    lines.push(`    return {`);
    lines.push(`      Page: pageMod.default,`);
    lines.push(`      layouts: layoutMods.map((m) => m.default),`);
    lines.push(`    };`);
    lines.push(`  },`);
    lines.push(`};`);
    lines.push("");

    chunkMap[NOT_FOUND_CHUNK_KEY] = chunkName;
  } else {
    lines.push(`export const notFoundRoute: ClientRouteLoaded | null = null;`);
    lines.push("");
  }

  if (errorPath) {
    const errorImportPath = toImportPath(errorPath);
    const chunkName = "route-error";

    lines.push(`export const errorRoute: ClientRouteLoaded = {`);
    lines.push(`  pattern: "${ERROR_CHUNK_KEY}",`);
    lines.push(`  paramNames: [],`);
    lines.push(`  load: async () => {`);
    lines.push(`    const mods = await Promise.all([`);
    lines.push(
      `      import(/* webpackChunkName: "${chunkName}" */ "${errorImportPath}"),`
    );

    if (rootLayoutPath) {
      const rootLayoutImportPath = toImportPath(rootLayoutPath);
      lines.push(
        `      import(/* webpackChunkName: "${chunkName}" */ "${rootLayoutImportPath}"),`
      );
    }

    lines.push(`    ]);`);
    lines.push(`    const [pageMod, ...layoutMods] = mods;`);
    lines.push(`    return {`);
    lines.push(`      Page: pageMod.default,`);
    lines.push(`      layouts: layoutMods.map((m) => m.default),`);
    lines.push(`    };`);
    lines.push(`  },`);
    lines.push(`};`);
    lines.push("");

    chunkMap[ERROR_CHUNK_KEY] = chunkName;
  } else {
    lines.push(`export const errorRoute: ClientRouteLoaded | null = null;`);
    lines.push("");
  }

  fs.writeFileSync(manifestPath, lines.join("\n"), "utf-8");

  const chunksJsonPath = path.join(fwDir, "route-chunks.json");
  fs.writeFileSync(chunksJsonPath, JSON.stringify(chunkMap, null, 2), "utf-8");
}

/**
 * Writes the client bootstrap manifest file.
 *
 * @param projectRoot - Root directory of the project
 */
export function writeClientBoostrapManifest(projectRoot: string): void {
  const buildDir = path.join(projectRoot, BUILD_FOLDER_NAME);
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const manifestPath = path.join(buildDir, "boostrap.ts");

  const lines: string[] = [];

  lines.push(`import "../app/${STYLE_FILE_NAME}";`);
  lines.push("");

  lines.push(`import {`);
  lines.push(`    routes,`);
  lines.push(`    type ClientRouteLoaded,`);
  lines.push(`    notFoundRoute,`);
  lines.push(`    errorRoute,`);
  lines.push(`} from "./routes-client";`);
  lines.push("");

  lines.push(`import { bootstrapClient } from "@lolyjs/core/runtime"`);
  lines.push("");
  lines.push(
    "bootstrapClient(routes as ClientRouteLoaded[], notFoundRoute, errorRoute);"
  );

  fs.writeFileSync(manifestPath, lines.join("\n"), "utf-8");
}

/**
 * Writes the routes manifest JSON file.
 *
 * This manifest contains only data (no functions) and is:
 * - Readable by Node without compiling TypeScript
 * - Usable by the production server
 * - Usable by build/SSG processes
 *
 * @param routes - Array of loaded page routes
 * @param apiRoutes - Array of loaded API routes
 * @param notFoundRoute - Not-found route definition
 * @param errorRoute - Error route definition (optional)
 * @param projectRoot - Root directory of the project
 * @param serverOutDir - Server output directory from buildServerApp
 * @param appDir - Absolute path to the app directory
 */
export function writeRoutesManifest({
  routes,
  apiRoutes,
  wssRoutes,
  notFoundRoute,
  errorRoute,
  projectRoot,
  serverOutDir,
  appDir,
}: {
  routes: LoadedRoute[];
  apiRoutes: ApiRoute[];
  wssRoutes: WssRoute[];
  notFoundRoute: LoadedRoute;
  errorRoute: LoadedRoute | null;
  projectRoot: string;
  serverOutDir: string;
  appDir: string;
}) {
  const fwDir = path.join(projectRoot, BUILD_FOLDER_NAME);
  if (!fs.existsSync(fwDir)) {
    fs.mkdirSync(fwDir, { recursive: true });
  }

  const manifestPath = path.join(fwDir, "routes-manifest.json");

  const toRelative = (abs: string) =>
    path.relative(projectRoot, abs).replace(/\\/g, "/");

  const convertToJs = (file: string) =>
    file.replace(/\.(ts|tsx|jsx|mjs|cjs)$/i, ".js");

  const pageEntries: PageRouteManifestEntry[] = routes.map((r) => {
    const relativeSource = path.relative(appDir, r.pageFile);

    const jsPageFile = path.join(serverOutDir, convertToJs(relativeSource));

    const jsLayoutFiles = r.layoutFiles.map((lf) => {
      const rel = path.relative(appDir, lf);
      return path.join(serverOutDir, convertToJs(rel));
    });

    return {
      type: "page",
      pattern: r.pattern,
      paramNames: r.paramNames,
      pageFile: toRelative(jsPageFile),
      layoutFiles: jsLayoutFiles.map(toRelative),
      dynamic: r.dynamic,
    };
  });

  const apiEntries: ApiRouteManifestEntry[] = apiRoutes
    .map((r) => {
      const anyRoute = r as any;
      const filePath: string | undefined = anyRoute.filePath;

      if (!filePath) {
        return undefined;
      }

      const relSource = path.relative(appDir, filePath);

      const jsApiFile = path.join(serverOutDir, convertToJs(relSource));

      const methods = Object.keys(r.handlers || {});

      const entry: ApiRouteManifestEntry = {
        type: "api",
        pattern: r.pattern,
        paramNames: r.paramNames,
        file: toRelative(jsApiFile),
        methods,
      };

      return entry;
    })
    .filter((e): e is ApiRouteManifestEntry => !!e);

  const wssEntries: WssRouteManifestEntry[] = wssRoutes
    .map((r) => {
      const anyRoute = r as any;
      const filePath: string | undefined = anyRoute.filePath;

      if (!filePath) {
        return undefined;
      }

      const relSource = path.relative(appDir, filePath);

      const jsApiFile = path.join(serverOutDir, convertToJs(relSource));

      const events = Object.keys(r.handlers || {});

      const entry: WssRouteManifestEntry = {
        type: "wss",
        pattern: r.pattern,
        paramNames: r.paramNames,
        file: toRelative(jsApiFile),
        events,
      };

      return entry;
    })
    .filter((e): e is WssRouteManifestEntry => !!e);

  // Build not-found page entry
  const notFoundLayoutFiles = notFoundRoute.layoutFiles || [];
  const notFoundJsLayoutFiles = notFoundLayoutFiles.map((lf) => {
    const rel = path.relative(appDir, lf);
    return path.join(serverOutDir, convertToJs(rel));
  });

  const notFoundRelativeSource = notFoundRoute.pageFile
    ? path.relative(appDir, notFoundRoute.pageFile)
    : `${NOT_FOUND_FILE_PREFIX}.tsx`;
  const notFoundJsPageFile = notFoundRoute.pageFile
    ? path.join(serverOutDir, convertToJs(notFoundRelativeSource))
    : path.join(serverOutDir, convertToJs(`${NOT_FOUND_FILE_PREFIX}.tsx`));

  const notFoundPage: PageRouteManifestEntry = {
    type: "page",
    pageFile: toRelative(notFoundJsPageFile),
    layoutFiles: notFoundJsLayoutFiles.map(toRelative),
    dynamic: "force-static",
    paramNames: [],
    pattern: NOT_FOUND_PATTERN,
  };

  // Build error page entry (if exists)
  let errorPageEntry: PageRouteManifestEntry | undefined;
  if (errorRoute && errorRoute.pageFile) {
    const errorLayoutFiles = errorRoute.layoutFiles || [];
    const errorJsLayoutFiles = errorLayoutFiles.map((lf) => {
      const rel = path.relative(appDir, lf);
      return path.join(serverOutDir, convertToJs(rel));
    });

    const errorRelativeSource = path.relative(appDir, errorRoute.pageFile);
    const errorJsPageFile = path.join(
      serverOutDir,
      convertToJs(errorRelativeSource)
    );

    errorPageEntry = {
      type: "page",
      pageFile: toRelative(errorJsPageFile),
      layoutFiles: errorJsLayoutFiles.map(toRelative),
      dynamic: "force-static",
      paramNames: [],
      pattern: ERROR_PATTERN,
    };
  }

  const manifest: RoutesManifest = {
    version: 1,
    basePath: "",
    caseSensitive: false,
    pages404: true,
    routes: pageEntries,
    apiRoutes: apiEntries,
    notFound: notFoundPage,
    wssRoutes: wssEntries,
    ...(errorPageEntry && { error: errorPageEntry }),
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}
