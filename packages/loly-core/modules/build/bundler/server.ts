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

  // Helper function to resolve alias to relative path
  function resolveAliasToRelative(importPath: string, sourceFile: string): string | null {
    // Skip relative paths, absolute paths, and node_modules
    if (
      importPath.startsWith(".") ||
      importPath.startsWith("/") ||
      path.isAbsolute(importPath) ||
      importPath.includes("node_modules")
    ) {
      return null;
    }

    // Check if the path starts with any alias
    for (const [aliasKey, aliasPath] of Object.entries(aliases)) {
      if (importPath.startsWith(aliasKey + "/") || importPath === aliasKey) {
        // Extract the path after the alias
        const restPath = importPath.startsWith(aliasKey + "/")
          ? importPath.slice(aliasKey.length + 1)
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

          return pathWithoutExt;
        }
      }
    }

    return null;
  }

  return {
    name: "path-alias-resolver",
    setup(build) {
      // Transform the source code to replace path aliases with relative paths
      // This works for both static and dynamic imports
      build.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, (args) => {
        // Only process server files (init.server.ts, config.server.ts) in the project root
        const fileName = path.basename(args.path);
        const isServerFile = SERVER_FILES.some(f => fileName === `${f}.ts` || fileName === `${f}.tsx` || fileName === `${f}.js` || fileName === `${f}.jsx`);
        const isInProjectRoot = path.dirname(args.path) === projectRoot;
        
        if (!isServerFile || !isInProjectRoot) {
          return null; // Let esbuild handle it normally
        }

        const contents = fs.readFileSync(args.path, "utf-8");
        let transformed = contents;

        // Replace path aliases in import/require statements
        // Match: import ... from "@/lib/..." or require("@/lib/...")
        // Also match: await import("@/lib/...")
        const aliasPatterns = Object.keys(aliases).sort((a, b) => b.length - a.length); // Sort by length (longest first) to avoid partial matches
        
        for (const aliasKey of aliasPatterns) {
          // Escape special regex characters in alias
          const escapedAlias = aliasKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          
          // Pattern to match the alias in quotes (works for both static and dynamic imports)
          // Matches: "@/lib/..." inside single, double, or backtick quotes
          const aliasInQuotesPattern = new RegExp(
            `(['"\`])${escapedAlias}(/[^'"\`\\s]*)?(['"\`])`,
            "g"
          );

          transformed = transformed.replace(aliasInQuotesPattern, (match, quote1, rest, quote2) => {
            const fullPath = aliasKey + (rest || "");
            const resolved = resolveAliasToRelative(fullPath, args.path);
            if (resolved) {
              return `${quote1}${resolved}${quote2}`;
            }
            return match;
          });
        }

        return {
          contents: transformed,
          loader: path.extname(args.path).slice(1) as "ts" | "tsx" | "js" | "jsx",
        };
      });

      // Also handle onResolve as a fallback for cases where onLoad doesn't catch it
      build.onResolve({ filter: /.*/ }, (args) => {
        const resolved = resolveAliasToRelative(args.path, args.importer || "");
        if (resolved) {
          return {
            path: resolved,
            namespace: "file",
          };
        }
        return null;
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
