import fs from "fs";
import path from "path";

/**
 * Ensures a directory exists, creating it recursively if needed.
 * 
 * This is a convenience wrapper around `fs.mkdirSync` with `recursive: true`.
 * 
 * @param dir - Directory path to ensure exists
 * 
 * @example
 * ensureDir('/path/to/directory');
 * // Directory is created if it doesn't exist
 */
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Loads path aliases from tsconfig.json.
 * 
 * Reads the tsconfig.json file and extracts path mappings from the `paths` option.
 * Falls back to a default `@app` alias if tsconfig.json is not found or invalid.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Record of alias keys to resolved paths
 * 
 * @example
 * // tsconfig.json
 * // {
 * //   "compilerOptions": {
 * //     "paths": {
 * //       "@components/*": ["components/*"]
 * //     }
 * //   }
 * // }
 * 
 * loadAliasesFromTsconfig('/project')
 * // { '@components': '/project/components', '@app': '/project/app' }
 */
export function loadAliasesFromTsconfig(
  projectRoot: string
): Record<string, string> {
  const tsconfigPath = path.join(projectRoot, "tsconfig.json");
  const aliases: Record<string, string> = {};

  if (!fs.existsSync(tsconfigPath)) {
    // Fallback: default @app alias
    aliases["@app"] = path.resolve(projectRoot, "app");
    return aliases;
  }

  let tsconfig: any;
  try {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
  } catch (err) {
    console.warn("[framework] Could not read tsconfig.json:", err);
    aliases["@app"] = path.resolve(projectRoot, "app");
    return aliases;
  }

  const compilerOptions = tsconfig.compilerOptions ?? {};
  const paths = compilerOptions.paths ?? {};
  const baseUrl = compilerOptions.baseUrl ?? ".";

  for (const [aliasPattern, targets] of Object.entries(paths) as [
    string,
    string[]
  ][]) {
    if (!Array.isArray(targets) || targets.length === 0) continue;

    // aliasPattern like "@components/*" -> "@components"
    const aliasKey = aliasPattern.replace(/\/\*$/, "");
    const firstTarget = targets[0]; // "components/*"
    const targetPath = firstTarget.replace(/\/\*$/, "");

    const resolved = path.resolve(projectRoot, baseUrl, targetPath);
    aliases[aliasKey] = resolved;
  }

  // Fallback: ensure @app alias exists
  if (!aliases["@app"]) {
    aliases["@app"] = path.resolve(projectRoot, "app");
  }

  return aliases;
}

/**
 * Recursively copies a directory and all its contents.
 * 
 * @param srcDir - Source directory to copy from
 * @param destDir - Destination directory to copy to
 */
export function copyDirRecursive(srcDir: string, destDir: string): void {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(destDir);

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copies static assets to the output directory.
 * 
 * Copies:
 * 1. `assets/` directory (if exists) → `outDir/assets/`
 * 2. Favicon files (`favicon.ico` or `favicon.png`) from `app/` or project root
 * 
 * @param projectRoot - Root directory of the project
 * @param outDir - Output directory to copy assets to
 * 
 * @example
 * copyStaticAssets('/project', '/project/.fw/client');
 * // Copies assets/ and favicon.* to .fw/client/
 */
export function copyStaticAssets(projectRoot: string, outDir: string): void {
  // 1) Copy assets/ directory (if exists) → .fw/client/assets/
  const assetsSrc = path.join(projectRoot, "assets");
  const assetsDest = path.join(outDir, "assets");
  copyDirRecursive(assetsSrc, assetsDest);

  // 2) Find and copy favicon from app/ or project root
  const appDir = path.join(projectRoot, "app");
  const candidates = ["favicon.ico", "favicon.png"];

  for (const name of candidates) {
    const fromApp = path.join(appDir, name);
    const fromRoot = path.join(projectRoot, name);

    let src: string | null = null;
    if (fs.existsSync(fromApp)) src = fromApp;
    else if (fs.existsSync(fromRoot)) src = fromRoot;

    if (src) {
      const dest = path.join(outDir, name); // Will be served as /static/favicon.*
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
      break; // Use the first one found
    }
  }
}
