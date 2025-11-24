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
 * Opción B "Next-like":
 * - appDir → multi-entry bundlado (bundle: true)
 * - SERVER_FILES (init/config) → solo transpilado (bundle: false)
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

  // 🔥 1) Compilar app/ → bundles CJS
  await esbuild.build({
    entryPoints,
    outdir: outDir,
    outbase: appDir,
    platform: "node",
    format: "cjs",
    target: "node18",
    jsx: "automatic",
    sourcemap: true,

    bundle: true,       // ✅ bundlear routes/components
    splitting: false,
    logLevel: "info",
    tsconfig: path.join(projectRoot, "tsconfig.json"),

    packages: "external",
  });

  // 🔧 2) Compilar archivos de infra (init/config) sin bundle
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

        bundle: false,   // ⬅️ volvemos a NO bundlear acá
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
