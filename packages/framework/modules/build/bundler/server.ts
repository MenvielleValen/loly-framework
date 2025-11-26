import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { ensureDir } from "../utils";
import { INIT_FILE_NAME } from "@server/init";
import { CONFIG_FILE_NAME } from "@server/config";
import { BUILD_FOLDER_NAME } from "@constants/globals";

const SERVER_FILES = [INIT_FILE_NAME, CONFIG_FILE_NAME];

export interface BuildServerResult {
  outDir: string;
}

function collectAppSources(appDir: string): string[] {
  const entries: string[] = [];

  function walk(dir: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const full = path.join(dir, item.name);

      if (item.isDirectory()) {
        walk(full);
        continue;
      }

      if (item.isFile()) {
        if (full.endsWith(".d.ts")) continue;

        if (
          full.endsWith(".ts") ||
          full.endsWith(".tsx") ||
          full.endsWith(".js") ||
          full.endsWith(".jsx")
        ) {
          entries.push(full);
        }
      }
    }
  }

  walk(appDir);
  return entries;
}

/**
 * Builds the server application.
 *
 * Compiles app directory with bundling enabled, and server files (init/config)
 * without bundling for direct require access.
 *
 * @param projectRoot - Root directory of the project
 * @param appDir - App directory to build
 * @returns Promise resolving to build result with output directory
 */
export async function buildServerApp(
  projectRoot: string,
  appDir: string
): Promise<BuildServerResult> {
  const outDir = path.join(projectRoot, BUILD_FOLDER_NAME, "server");

  const entryPoints = collectAppSources(appDir);
  ensureDir(outDir);

  if (entryPoints.length === 0) {
    return { outDir };
  }

  await esbuild.build({
    entryPoints,
    outdir: outDir,
    outbase: appDir,
    platform: "node",
    format: "cjs",
    target: "node18",
    jsx: "automatic",
    sourcemap: true,
    bundle: true,
    splitting: false,
    logLevel: "info",
    tsconfig: path.join(projectRoot, "tsconfig.json"),
    packages: "external",
  });

  for (const fileName of SERVER_FILES) {
    const initTS = path.join(projectRoot, `${fileName}.ts`);
    const initJS = path.join(outDir, `${fileName}.js`);

    if (fs.existsSync(initTS)) {
      await esbuild.build({
        entryPoints: [initTS],
        outfile: initJS,
        platform: "node",
        format: "cjs",
        target: "node18",
        jsx: "automatic",
        sourcemap: true,
        bundle: false,
        logLevel: "info",
        tsconfig: path.join(projectRoot, "tsconfig.json"),
      });
    }
  }

  return { outDir };
}
