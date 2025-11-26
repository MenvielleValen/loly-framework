import { rspack, type Compiler } from "@rspack/core";
import { createClientConfig } from "../config/client";
import { copyStaticAssets } from "../utils";

export interface ClientBundlerResult {
  outDir: string;
}

/**
 * Starts the client bundler in watch mode for development.
 * 
 * Automatically rebuilds when files change and copies static assets.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Output directory path
 * 
 * @example
 * const { outDir } = startClientBundler('/path/to/project');
 * // Bundler is now watching for changes
 */
export function startClientBundler(
  projectRoot: string
): ClientBundlerResult {
  const { config, outDir } = createClientConfig(projectRoot, "production");

  copyStaticAssets(projectRoot, outDir);

  const compiler = rspack(config);

  compiler.watch({}, (err, stats) => {
      if (err) {
        console.error("[framework][client] Rspack error:", err);
        return;
      }
      if (!stats) return;

      if (stats.hasErrors()) {
        console.error(
          "[framework][client] Build with errors:\n",
          stats.toString("errors-only")
        );
      }
  });

  return { outDir };
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
        console.error("[framework][client] Build error:", err);
        return reject(err);
      }
      if (!stats) {
        const error = new Error("No stats from Rspack");
        console.error("[framework][client] Build error:", error);
        return reject(error);
      }
      if (stats.hasErrors()) {
        console.error(
          "[framework][client] Build with errors:\n",
          stats.toString("errors-only")
        );
        return reject(new Error("Client build failed"));
      }

      copyStaticAssets(projectRoot, outDir);

      resolve({ outDir });
    });
  });
}

