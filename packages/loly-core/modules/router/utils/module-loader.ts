import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export interface ModuleLoaderOptions {
  projectRoot?: string;
}

// Global flag to track if tsx/esm has been registered
let tsxRegistered = false;
let tsxRegistrationPromise: Promise<void> | null = null;

// Attempt to register tsx/esm loader when this module is first loaded
// This must happen before any TypeScript files are imported
// The loader registration happens when tsx/esm is first imported
// We do this eagerly to ensure it happens as early as possible
try {
  // @ts-expect-error - tsx/esm may not have type definitions, but it exists at runtime
  import("tsx/esm").then(() => {
    tsxRegistered = true;
  }).catch(() => {
    // tsx might not be available, that's okay
    tsxRegistered = true; // Mark as "attempted" to avoid repeated tries
  });
} catch {
  // Ignore if import fails at module load time
}

/**
 * Resolves the tsx/esm module path from the project root.
 * This allows tsx to be found even if it's installed in the app's node_modules
 * rather than in loly-core's node_modules.
 */
async function resolveTsxPath(projectRoot?: string): Promise<string | null> {
  if (!projectRoot) {
    return null;
  }

  // Try to find tsx in the project's node_modules
  // tsx/esm resolves to dist/esm/index.mjs according to package.json exports
  const tsxPath = path.join(projectRoot, "node_modules", "tsx", "dist", "esm", "index.mjs");
  if (fs.existsSync(tsxPath)) {
    return pathToFileURL(tsxPath).href;
  }

  // Fallback: try to resolve using require.resolve (if available in ESM context)
  try {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const tsxModulePath = require.resolve("tsx/esm", { paths: [projectRoot] });
    return pathToFileURL(tsxModulePath).href;
  } catch {
    return null;
  }
}

/**
 * Ensures tsx/esm loader is registered for TypeScript files.
 * This must be called BEFORE any dynamic imports of .ts/.tsx files.
 * 
 * NOTE: In Node.js ESM, loaders must be registered before any imports.
 * This function attempts to register tsx, but if it's called too late
 * (after Node.js has already processed imports), it may not work.
 * The loader should ideally be registered via --import flag or at process startup.
 */
async function ensureTsxRegistered(projectRoot?: string): Promise<void> {
  // If already registered, return immediately
  if (tsxRegistered) {
    return;
  }

  // If registration is in progress, wait for it
  if (tsxRegistrationPromise) {
    await tsxRegistrationPromise;
    return;
  }

  // Start registration
  tsxRegistrationPromise = (async () => {
    try {
      // Try to resolve tsx from project root first (if available)
      const tsxPath = await resolveTsxPath(projectRoot);
      
      if (tsxPath) {
        // Import from resolved path
        await import(tsxPath);
      } else {
        // Fallback: try bare import (might work if tsx is hoisted)
        // @ts-expect-error - tsx/esm may not have type definitions, but it exists at runtime
        await import("tsx/esm");
      }
      tsxRegistered = true;
    } catch (error) {
      // tsx might not be available or already registered, continue
      // In production runtime, files are already compiled to .mjs
      // Set to true anyway to avoid repeated attempts
      tsxRegistered = true;
    }
  })();

  await tsxRegistrationPromise;
}

/**
 * Loads a module using ESM dynamic import.
 * Returns `null` if the file does not exist.
 * 
 * For TypeScript files in development/build, uses tsx to load them directly.
 * For compiled files (.mjs), uses dynamic import.
 */
export async function loadModule<T = any>(
  filePath: string,
  options: ModuleLoaderOptions = {}
): Promise<T | null> {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const ext = path.extname(filePath);
  const isTypeScript = ext === ".ts" || ext === ".tsx";

  // For TypeScript files, ensure tsx is loaded (both in dev and build)
  // This must happen BEFORE the dynamic import
  if (isTypeScript) {
    await ensureTsxRegistered(options.projectRoot);
  }

  // Always use dynamic import for ESM (even for TypeScript files)
  // This ensures top-level await and other ESM features work correctly
  // pathToFileURL handles Windows paths correctly
  // When tsx is registered, it will handle .ts/.tsx files automatically
  const mod = await import(pathToFileURL(filePath).href);
  return (mod as T) ?? null;
}

/**
 * Convenience helper to load a default export.
 */
export async function loadDefaultExport<T = any>(
  filePath: string,
  options: ModuleLoaderOptions = {}
): Promise<T | null> {
  const mod = await loadModule<any>(filePath, options);
  if (!mod) return null;
  if ("default" in mod && mod.default !== undefined) {
    return mod.default as T;
  }
  return mod as T;
}
