import fs from "fs";
import path from "path";
import {
  ApiRoute,
  ApiRouteManifestEntry,
  LoadedRoute,
  PageRouteManifestEntry,
  RoutesManifest,
} from "./index.types";
import { BUILD_FOLDER_NAME, STYLE_FILE_NAME } from "@constants/globals";

/**
 * Writes the client-side routes manifest file.
 *
 * Generates a TypeScript file that exports route definitions with lazy-loaded
 * components for code splitting. The manifest is used by the client runtime
 * to handle client-side navigation.
 *
 * @param routes - Array of loaded routes
 * @param projectRoot - Root directory of the project
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
      pattern
        .replace(/^\//, "")
        .replace(/\//g, "_")
        .replace(/\[|\]/g, "") || "root";

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
  const rootLayoutPath = findRootLayout();

  if (notFoundPath) {
    const notFoundImportPath = toImportPath(notFoundPath);
    const chunkName = "route-not-found";

    lines.push(`export const notFoundRoute: ClientRouteLoaded = {`);
    lines.push(`  pattern: "__fw_not_found__",`);
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

    chunkMap["__fw_not_found__"] = chunkName;
  } else {
    lines.push(`export const notFoundRoute: ClientRouteLoaded | null = null;`);
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
  lines.push(`} from "./routes-client";`);
  lines.push("");

  lines.push(
    `import { bootstrapClient } from "@loly/core/modules/runtime/client"`
  );
  lines.push("");
  lines.push("bootstrapClient(routes as ClientRouteLoaded[], notFoundRoute);");

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
 * @param projectRoot - Root directory of the project
 * @param serverOutDir - Server output directory from buildServerApp
 * @param appDir - Absolute path to the app directory
 */
export function writeRoutesManifest(
  routes: LoadedRoute[],
  apiRoutes: ApiRoute[],
  notFoundRoute: LoadedRoute,
  projectRoot: string,
  serverOutDir: string,
  appDir: string
) {
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

    const jsPageFile = path.join(
      serverOutDir,
      convertToJs(relativeSource)
    );

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

      const jsApiFile = path.join(
        serverOutDir,
        convertToJs(relSource)
      );

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

  if(!notFoundRoute?.layoutFiles){
    return;
  }

  const jsLayoutFiles = notFoundRoute.layoutFiles.map((lf) => {
    const rel = path.relative(appDir, lf);
    return path.join(serverOutDir, convertToJs(rel));
  });

  const notFoundPage: PageRouteManifestEntry = {
    type: "page",
    pageFile: toRelative(
      path.join(
        serverOutDir,
        convertToJs("/not-found/page.tsx")
      )
    ),
    layoutFiles: jsLayoutFiles.map(toRelative),
    dynamic: "force-static",
    paramNames: [],
    pattern: "/not-found",
  };

  const manifest: RoutesManifest = {
    version: 1,
    basePath: "",
    caseSensitive: false,
    pages404: true,
    routes: pageEntries,
    apiRoutes: apiEntries,
    notFound: notFoundPage,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}
