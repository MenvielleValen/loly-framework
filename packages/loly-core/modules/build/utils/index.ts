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
 * copyStaticAssets('/project', '/project/{BUILD_FOLDER_NAME}/client');
 * // Copies assets/ and favicon.* to {BUILD_FOLDER_NAME}/client/
 */
export function copyStaticAssets(projectRoot: string, outDir: string): void {
  // 1) Copy assets/ directory (if exists) → {BUILD_FOLDER_NAME}/client/assets/
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
      const dest = path.join(outDir, name); // Will be served as ${STATIC_PATH}/favicon.*
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
      break; // Use the first one found
    }
  }
}

/**
 * Asset manifest interface for tracking hashed filenames.
 */
export interface AssetManifest {
  client: {
    js: string; // e.g., "client.abc123.js"
    css: string; // e.g., "client.def456.css"
  };
  chunks: Record<string, string>; // chunk name -> hashed filename, e.g., "route-root" -> "route-root.xyz789.js"
}

/**
 * Generates an asset manifest by scanning the build output directory.
 * 
 * Finds files with content hashes and maps them to their logical names.
 * 
 * @param outDir - Output directory to scan
 * @returns Asset manifest with hashed filenames
 * 
 * @example
 * const manifest = generateAssetManifest('/project/.loly/client');
 * // { client: { js: 'client.abc123.js', css: 'client.def456.css' }, chunks: {...} }
 */
export function generateAssetManifest(outDir: string): AssetManifest {
  const manifest: AssetManifest = {
    client: {
      js: "client.js",
      css: "client.css",
    },
    chunks: {},
  };

  if (!fs.existsSync(outDir)) {
    return manifest;
  }

  const files = fs.readdirSync(outDir);
  
  // Find client.js (with or without hash)
  const clientJsMatch = files.find((f) => /^client\.[\w-]+\.js$/.test(f) || f === "client.js");
  if (clientJsMatch) {
    manifest.client.js = clientJsMatch;
  }

  // Find client.css (with or without hash)
  const clientCssMatch = files.find((f) => /^client\.[\w-]+\.css$/.test(f) || f === "client.css");
  if (clientCssMatch) {
    manifest.client.css = clientCssMatch;
  }

  // Find all chunk files (route-*.js, 0.js, 1.js, etc. with or without hash)
  // Pattern: route-*.js or numeric chunks like 0.js, 1.js, etc.
  for (const file of files) {
    if (!file.endsWith(".js")) continue;
    
    // Skip the main client.js file
    if (file === manifest.client.js) continue;
    
    // Match route chunks: route-*.js or route-*.[hash].js
    const routeMatch = file.match(/^(route-[^.]+)(\.[\w-]+)?\.js$/);
    if (routeMatch) {
      const chunkName = routeMatch[1]; // e.g., "route-root"
      manifest.chunks[chunkName] = file;
      continue;
    }
    
    // Match numeric chunks: 0.js, 1.js, etc. or 0.[hash].js
    const numericMatch = file.match(/^(\d+)(\.[\w-]+)?\.js$/);
    if (numericMatch) {
      const chunkName = numericMatch[1]; // e.g., "0"
      manifest.chunks[chunkName] = file;
    }
  }

  return manifest;
}

/**
 * Loads the asset manifest from the build directory.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Asset manifest or null if not found
 */
export function loadAssetManifest(projectRoot: string): AssetManifest | null {
  const { BUILD_FOLDER_NAME } = require("@constants/globals");
  const manifestPath = path.join(projectRoot, BUILD_FOLDER_NAME, "asset-manifest.json");
  
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const manifest: AssetManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    return manifest;
  } catch (err) {
    return null;
  }
}

/**
 * Gets the client JS path with hash from the asset manifest.
 * Falls back to default path if manifest is not available.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Path to client JS file (e.g., "/static/client.abc123.js")
 */
export function getClientJsPath(projectRoot: string): string {
  const { STATIC_PATH } = require("@constants/globals");
  const manifest = loadAssetManifest(projectRoot);
  const filename = manifest?.client.js || "client.js";
  return `${STATIC_PATH}/${filename}`;
}

/**
 * Gets the client CSS path with hash from the asset manifest.
 * Falls back to default path if manifest is not available.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Path to client CSS file (e.g., "/static/client.def456.css")
 */
export function getClientCssPath(projectRoot: string): string {
  const { STATIC_PATH } = require("@constants/globals");
  const manifest = loadAssetManifest(projectRoot);
  const filename = manifest?.client.css || "client.css";
  return `${STATIC_PATH}/${filename}`;
}