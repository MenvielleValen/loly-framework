import path from "path";
import fs from "fs";
import esbuild from "esbuild";

export interface BuildServerResult {
  outDir: string;
}

// Recorre appDir y devuelve todos los archivos .ts/.tsx/.js/.jsx
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
 * Compila la carpeta app/ del usuario a .fw/server en formato CJS.
 * Mantiene la misma estructura de carpetas (outbase = appDir).
 */
export async function buildServerApp(
  projectRoot: string,
  appDir: string
): Promise<BuildServerResult> {
  const outDir = path.join(projectRoot, ".fw", "server");
  const entryPoints = collectAppSources(appDir);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log({
    projectRoot,
    appDir,
    outDir,
  });

  if (entryPoints.length === 0) {
    console.warn(
      "[framework][server-build] No se encontraron fuentes en appDir:",
      appDir
    );
    return { outDir };
  }

  await esbuild.build({
    entryPoints,
    outdir: outDir,
    outbase: appDir, // conserva estructura relativa
    platform: "node",
    format: "cjs",
    target: "node18",
    jsx: "automatic",
    sourcemap: true,
    bundle: false, // 1 archivo tsx -> 1 archivo js
    logLevel: "info",
    tsconfig: path.join(projectRoot, "tsconfig.json"),
  });

  console.log("[framework][server-build] Build server OK en", outDir);
  return { outDir };
}
