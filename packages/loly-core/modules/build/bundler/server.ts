import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { ensureDir, loadAliasesFromTsconfig } from "../utils";
import { INIT_FILE_NAME } from "@server/init";
import { CONFIG_FILE_NAME } from "@server/config";
import { BUILD_FOLDER_NAME } from "@constants/globals";

const SERVER_FILES = [INIT_FILE_NAME, CONFIG_FILE_NAME];

export interface BuildServerResult {
  outDir: string;
}

/**
 * Creates an esbuild plugin that resolves TypeScript path aliases to relative paths.
 * This is needed when bundle: false because esbuild doesn't resolve aliases in that mode.
 * 
 * @param projectRoot - Root directory of the project
 * @param outDir - Output directory where compiled files will be placed
 * @returns esbuild plugin that resolves path aliases
 */
function createPathAliasPlugin(
  projectRoot: string,
  outDir: string
): esbuild.Plugin {
  const aliases = loadAliasesFromTsconfig(projectRoot);
  
  // Read tsconfig to get baseUrl
  const tsconfigPath = path.join(projectRoot, "tsconfig.json");
  let baseUrl = ".";
  if (fs.existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
      baseUrl = tsconfig.compilerOptions?.baseUrl ?? ".";
    } catch {
      // Use default baseUrl
    }
  }

  return {
    name: "path-alias-resolver",
    setup(build) {
      // Intercept all import paths
      build.onResolve({ filter: /.*/ }, (args) => {
        // Skip relative paths, absolute paths, and node_modules
        if (
          args.path.startsWith(".") ||
          args.path.startsWith("/") ||
          path.isAbsolute(args.path) ||
          args.path.includes("node_modules")
        ) {
          return null; // Let esbuild handle it normally
        }

        // Check if the path starts with any alias
        for (const [aliasKey, aliasPath] of Object.entries(aliases)) {
          if (args.path.startsWith(aliasKey + "/") || args.path === aliasKey) {
            // Extract the path after the alias
            const restPath = args.path.startsWith(aliasKey + "/")
              ? args.path.slice(aliasKey.length + 1)
              : "";
            
            // Resolve to absolute path
            const resolvedPath = restPath
              ? path.join(aliasPath, restPath)
              : aliasPath;

            // Try to find the actual file (with extensions)
            let actualPath: string | null = null;
            const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
            
            // Check if it's a directory with index file
            if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
              for (const ext of extensions) {
                const indexPath = path.join(resolvedPath, `index${ext}`);
                if (fs.existsSync(indexPath)) {
                  actualPath = indexPath;
                  break;
                }
              }
            } else {
              // Check if file exists with any extension
              for (const ext of extensions) {
                const filePath = resolvedPath + ext;
                if (fs.existsSync(filePath)) {
                  actualPath = filePath;
                  break;
                }
              }
              
              // If no extension match, check if the path itself exists
              if (!actualPath && fs.existsSync(resolvedPath)) {
                actualPath = resolvedPath;
              }
            }

            if (actualPath) {
              // Calculate relative path from output directory to the resolved file
              // This is needed because when bundle: false, esbuild doesn't transform
              // absolute paths to relative paths automatically
              const relativePath = path.relative(outDir, actualPath);
              
              // Normalize to use forward slashes (works on Windows too)
              const normalizedPath = relativePath.replace(/\\/g, "/");
              
              // Ensure it starts with ./ for relative imports
              const finalPath = normalizedPath.startsWith(".")
                ? normalizedPath
                : `./${normalizedPath}`;

              // Remove file extension for CommonJS imports (Node.js will resolve it)
              // But keep .json extension as it's required
              const ext = path.extname(finalPath);
              const pathWithoutExt = ext === ".json" 
                ? finalPath 
                : finalPath.slice(0, -ext.length);

              return {
                path: pathWithoutExt,
                namespace: "file",
              };
            }
          }
        }

        return null; // Let esbuild handle it normally
      });
    },
  };
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

  // Create path alias plugin for server files
  const pathAliasPlugin = createPathAliasPlugin(projectRoot, outDir);

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
        plugins: [pathAliasPlugin],
      });
    }
  }

  return { outDir };
}
