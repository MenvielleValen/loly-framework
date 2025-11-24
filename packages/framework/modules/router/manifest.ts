import fs from "fs";
import path from "path";
import {
  ApiRoute,
  ApiRouteManifestEntry,
  LoadedRoute,
  PageRouteManifestEntry,
  RoutesManifest,
} from "./index.types";

/**
 * Writes the client-side routes manifest file.
 *
 * Generates a TypeScript file that exports route definitions with lazy-loaded
 * components for code splitting. The manifest is used by the client runtime
 * to handle client-side navigation.
 *
 * @param routes - Array of loaded routes
 * @param projectRoot - Root directory of the project
 *
 * @example
 * // Generated .fw/routes-client.ts
 * export const routes = [
 *   {
 *     pattern: "/blog/[slug]",
 *     paramNames: ["slug"],
 *     load: async () => {
 *       const mods = await Promise.all([
 *         import("./app/blog/[slug]/page"),
 *         import("./app/layout"),
 *       ]);
 *       return {
 *         Page: mods[0].default,
 *         layouts: [mods[1].default],
 *       };
 *     },
 *   },
 * ];
 */
export function writeClientRoutesManifest(
  routes: LoadedRoute[],
  projectRoot: string
): void {
  const fwDir = path.join(projectRoot, ".fw");
  if (!fs.existsSync(fwDir)) {
    fs.mkdirSync(fwDir, { recursive: true });
  }

  const manifestPath = path.join(fwDir, "routes-client.ts");
  const manifestDir = path.dirname(manifestPath);

  /**
   * Converts an absolute file path to a relative import path from the manifest.
   */
  function toImportPath(filePath: string): string {
    const relRaw = path.relative(manifestDir, filePath).replace(/\\/g, "/");
    const rel = relRaw.startsWith(".") ? relRaw : "./" + relRaw;
    // Remove extension so bundler can resolve .tsx, .ts, .jsx, .js
    return rel.replace(/\.(tsx|ts|jsx|js)$/, "");
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

  lines.push(`export const routes: ClientRouteLoaded[] = [`);

  for (const route of routes) {
    const pattern = route.pattern;
    const paramNames = route.paramNames;

    // page + layouts
    const modulePaths = [route.pageFile, ...route.layoutFiles].map(
      toImportPath
    );

    // Safe name for webpack chunks: /blog/[slug] -> blog_slug
    const safeName =
      pattern
        .replace(/^\//, "") // Remove leading slash
        .replace(/\//g, "_") // / -> _
        .replace(/\[|\]/g, "") || // Remove []
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

  fs.writeFileSync(manifestPath, lines.join("\n"), "utf-8");
  console.log(
    `[framework] Client routes manifest generated at ${manifestPath}`
  );

  // Save route chunks
  const chunksJsonPath = path.join(fwDir, "route-chunks.json");
  fs.writeFileSync(chunksJsonPath, JSON.stringify(chunkMap, null, 2), "utf-8");
  console.log(
    `[framework] Route chunks manifest generated at ${chunksJsonPath}`
  );
}

/**
 * Genera `.fw/routes-manifest.json` con sólo datos (sin funciones).
 *
 * Este manifest es:
 *  - legible por Node sin compilar TS
 *  - usable por el servidor de prod
 *  - usable por procesos de build/SSG
 *
 * Cada entrada de page incluye pattern, params, archivos de page+layouts y dynamic.
 */
export function writeRoutesManifest(
  routes: LoadedRoute[],
  apiRoutes: ApiRoute[],
  projectRoot: string,
  serverOutDir: string, // viene de buildServerApp
  appDir: string        // ruta absoluta a app/
) {
  const fwDir = path.join(projectRoot, ".fw");
  if (!fs.existsSync(fwDir)) {
    fs.mkdirSync(fwDir, { recursive: true });
  }

  const manifestPath = path.join(fwDir, "routes-manifest.json");

  const toRelative = (abs: string) =>
    path.relative(projectRoot, abs).replace(/\\/g, "/");

  const convertToJs = (file: string) =>
    file.replace(/\.(ts|tsx|jsx|mjs|cjs)$/i, ".js");

  // --------- PAGES ---------
  const pageEntries: PageRouteManifestEntry[] = routes.map((r) => {
    // ej: appDir = /.../app
    // r.pageFile = /.../app/blog/[slug]/page.tsx
    const relativeSource = path.relative(appDir, r.pageFile); // blog/[slug]/page.tsx

    const jsPageFile = path.join(
      serverOutDir,
      convertToJs(relativeSource) // blog/[slug]/page.js
    );

    const jsLayoutFiles = r.layoutFiles.map((lf) => {
      const rel = path.relative(appDir, lf);  // ej: layout.tsx
      return path.join(serverOutDir, convertToJs(rel)); // → .js
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

  // --------- API ROUTES ---------
  const apiEntries: ApiRouteManifestEntry[] = apiRoutes
    .map((r) => {
      const anyRoute = r as any;
      const filePath: string | undefined = anyRoute.filePath;

      if (!filePath) {
        // si por alguna razón no seteaste filePath en loadApiRoutes, lo salteamos
        console.warn(
          `[framework] ApiRoute sin filePath para pattern "${r.pattern}", se ignora en manifest.`
        );
        return undefined;
      }

      // filePath = /.../app/api/posts/[id]/route.ts
      const relSource = path.relative(appDir, filePath); // api/posts/[id]/route.ts

      const jsApiFile = path.join(
        serverOutDir,
        convertToJs(relSource) // api/posts/[id]/route.js
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

  const manifest: RoutesManifest = {
    version: 1,
    basePath: "",
    caseSensitive: false,
    pages404: true,
    routes: pageEntries,
    apiRoutes: apiEntries,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`[framework] routes-manifest.json generado en ${manifestPath}`);
}
