import fs from "fs";
import path from "path";
import { LoadedRoute } from "./index.types";

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

    lines.push("  {");
    lines.push(`    pattern: ${JSON.stringify(pattern)},`);
    lines.push(`    paramNames: ${JSON.stringify(paramNames)},`);
    lines.push(`    load: async () => {`);
    lines.push(`      const mods = await Promise.all([`);

    for (const p of modulePaths) {
      lines.push(
        `        import(/* webpackChunkName: "route-${safeName}" */ "${p}"),`
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
  console.log(`[framework] Client routes manifest generated at ${manifestPath}`);
}
