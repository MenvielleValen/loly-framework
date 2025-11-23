import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { ensureDir } from "../utils";
import { INIT_FILE_NAME } from "@server/init";
import { CONFIG_FILE_NAME } from "@server/config";

const SERVER_FILES = [INIT_FILE_NAME, CONFIG_FILE_NAME];

export interface BuildServerResult {
  outDir: string;
}

/**
 * Collects all TypeScript/JavaScript source files from the app directory.
 *
 * Recursively walks through the directory and collects all .ts, .tsx, .js, .jsx files,
 * excluding .d.ts declaration files.
 *
 * @param appDir - Application source directory
 * @returns Array of absolute file paths
 */
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
        // Skip declaration files
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
 * Builds the server-side application code.
 *
 * Compiles the app directory to CommonJS format in .fw/server, maintaining
 * the same directory structure. Uses esbuild for fast compilation.
 *
 * @param projectRoot - Root directory of the project
 * @param appDir - Source application directory (e.g., 'app')
 * @returns Promise that resolves with output directory path
 *
 * @example
 * const { outDir } = await buildServerApp('/path/to/project', 'app');
 * // Server code compiled to .fw/server
 */
export async function buildServerApp(
  projectRoot: string,
  appDir: string
): Promise<BuildServerResult> {
  const outDir = path.join(projectRoot, ".fw", "server");

  const entryPoints = collectAppSources(appDir);

  ensureDir(outDir);

  if (entryPoints.length === 0) {
    console.warn(
      "[framework][server-build] No source files found in appDir:",
      appDir
    );
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
    bundle: false,
    logLevel: "info",
    tsconfig: path.join(projectRoot, "tsconfig.json"),
  });

  /**
   * Compile framework server files
   */
  for (const fileName of SERVER_FILES) {
    const initTS = path.join(projectRoot, `${fileName}.ts`);
    const initJS = path.join(outDir, `${fileName}.js`);

    if (fs.existsSync(initTS)) {
      console.log(`[Loly][server-build] Compiling ${fileName}.ts`);

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

      console.log(
        `[framework][server-build] ${fileName}.ts compiled in`,
        initJS
      );
    } else {
      console.warn(`[Loly][server-build] Not found file ${fileName}.ts`);
    }
  }

  console.log("[framework][server-build] Server build successful at", outDir);
  return { outDir };
}
