import { rspack, type Compiler } from "@rspack/core";
import { createClientConfig } from "../config/client";
import { copyStaticAssets, generateAssetManifest } from "../utils";
import path from "path";
import fs from "fs";
import { BUILD_FOLDER_NAME } from "@constants/globals";

export interface ClientBundlerResult {
  outDir: string;
  waitForBuild?: () => Promise<void>;
}

/**
 * Starts the client bundler in watch mode for development.
 * 
 * Automatically rebuilds when files change and copies static assets.
 * 
 * @param projectRoot - Root directory of the project
 * @param mode - Build mode ('development' or 'production'), defaults to 'development'
 * @returns Output directory path
 * 
 * @example
 * const { outDir } = startClientBundler('/path/to/project', 'development');
 * // Bundler is now watching for changes
 */
export function startClientBundler(
  projectRoot: string,
  mode: "development" | "production" = "development"
): ClientBundlerResult {
  const { config, outDir } = createClientConfig(projectRoot, mode);

  copyStaticAssets(projectRoot, outDir);

  const compiler = rspack(config);
  
  // Track build state
  let isBuilding = false;
  let buildResolve: (() => void) | null = null;
  let buildPromise: Promise<void> | null = null;
  let lastBuildTime = Date.now();

  // Mark as building when compilation starts
  compiler.hooks.compile.tap("HotReload", () => {
    isBuilding = true;
    // Create new promise for this build
    buildPromise = new Promise<void>((resolve) => {
      buildResolve = resolve;
    });
  });

  compiler.watch({}, (err, stats) => {
      if (err) {
        console.error("\n❌ [framework][client] Rspack compilation error:");
        console.error(err);
        console.error("\n💡 Suggestions:");
        console.error("  • Check for syntax errors in your code");
        console.error("  • Verify all imports are correct");
        console.error("  • Ensure all dependencies are installed");
        console.error("  • Try deleting .loly folder and rebuilding\n");
        isBuilding = false;
        lastBuildTime = Date.now();
        // Resolve any waiting promises even on error
        if (buildResolve) {
          buildResolve();
          buildResolve = null;
          buildPromise = null;
        }
        return;
      }
      if (!stats) {
        console.warn("⚠️  [framework][client] Build completed but no stats available");
        isBuilding = false;
        lastBuildTime = Date.now();
        return;
      }

      if (stats.hasErrors()) {
        console.error("\n❌ [framework][client] Build failed with errors:\n");
        console.error(stats.toString("errors-only"));
        console.error("\n💡 Common fixes:");
        console.error("  • Fix syntax errors shown above");
        console.error("  • Check for missing imports or dependencies");
        console.error("  • Verify TypeScript types are correct\n");
      } else {
        console.log("✅ [framework][client] Client bundle rebuilt successfully");
      }
      
      isBuilding = false;
      lastBuildTime = Date.now();
      
      // Resolve waiting promise
      if (buildResolve) {
        buildResolve();
        buildResolve = null;
        buildPromise = null;
      }
  });

  return {
    outDir,
    waitForBuild: async () => {
      // If currently building, wait for it to finish
      if (isBuilding && buildPromise) {
        await buildPromise;
        // Give it a small delay to ensure files are written to disk
        await new Promise(resolve => setTimeout(resolve, 100));
        return;
      }
      
      // If not building, check if a build just finished recently
      // (within last 500ms) - this handles the case where the build
      // finished just before we checked
      const timeSinceLastBuild = Date.now() - lastBuildTime;
      if (timeSinceLastBuild < 500) {
        // Build just finished, wait a bit for files to be written
        await new Promise(resolve => setTimeout(resolve, 200));
        return;
      }
      
      // No build in progress and none recently finished, return immediately
      return Promise.resolve();
    },
  };
}

/**
 * Builds the client bundle for production.
 * 
 * Creates an optimized production bundle and copies static assets.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Promise that resolves with output directory path
 * 
 * @example
 * const { outDir } = await buildClientBundle('/path/to/project');
 * // Production bundle created at {BUILD_FOLDER_NAME}/client
 */
export function buildClientBundle(
  projectRoot: string
): Promise<ClientBundlerResult> {
  const { config, outDir } = createClientConfig(projectRoot, "production");
  const compiler = rspack(config);

  return new Promise<ClientBundlerResult>((resolve, reject) => {
    compiler.run((err, stats) => {
      compiler.close(() => {});

      if (err) {
        console.error("\n❌ [framework][client] Production build error:");
        console.error(err);
        console.error("\n💡 Suggestions:");
        console.error("  • Check for syntax errors in your code");
        console.error("  • Verify all imports are correct");
        console.error("  • Ensure all dependencies are installed");
        console.error("  • Review the error details above\n");
        return reject(err);
      }
      if (!stats) {
        const error = new Error("No stats from Rspack - build may have failed silently");
        console.error("\n❌ [framework][client] Build error:", error.message);
        console.error("💡 Try rebuilding or check Rspack configuration\n");
        return reject(error);
      }
      if (stats.hasErrors()) {
        console.error("\n❌ [framework][client] Production build failed:\n");
        console.error(stats.toString("errors-only"));
        console.error("\n💡 Common fixes:");
        console.error("  • Fix syntax errors shown above");
        console.error("  • Check for missing imports or dependencies");
        console.error("  • Verify TypeScript types are correct");
        console.error("  • Review build configuration\n");
        return reject(new Error("Client build failed - see errors above"));
      }

      copyStaticAssets(projectRoot, outDir);

      // Generate asset manifest with hashed filenames using stats for entrypoints
      const assetManifest = generateAssetManifest(outDir, stats);
      
      // Save asset manifest
      const manifestPath = path.join(projectRoot, BUILD_FOLDER_NAME, "asset-manifest.json");
      fs.writeFileSync(manifestPath, JSON.stringify(assetManifest, null, 2), "utf-8");

      resolve({ outDir });
    });
  });
}

