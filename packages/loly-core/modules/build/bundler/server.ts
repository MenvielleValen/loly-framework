import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { ensureDir, loadAliasesFromTsconfig } from "../utils";
import { INIT_FILE_NAME } from "@server/init";
import { CONFIG_FILE_NAME } from "@server/config";
import { BUILD_FOLDER_NAME } from "@constants/globals";
import type { FrameworkConfig } from "@src/config";
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

          // Remove file extension for ESM imports (Node.js will resolve it)
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
      // Helper to resolve alias to absolute path (for onResolve)
      function resolveAliasToAbsolute(importPath: string): string | null {
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
              return actualPath;
            }
          }
        }

        return null;
      }

      // Handle onResolve to resolve path aliases during module resolution
      // This works for all files (app directory and server files)
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        // Only process non-relative imports (like @/lib/...)
        // Skip relative paths (./ or ../) and absolute paths (/)
        const absolutePath = resolveAliasToAbsolute(args.path);
        if (absolutePath && fs.existsSync(absolutePath)) {
          return {
            path: absolutePath,
            namespace: "file",
          };
        }
        return null;
      });

      // Transform the source code to replace path aliases with relative paths
      // This is mainly for server files (init.server.ts, config.server.ts) when bundle: false
      // For app directory files with bundle: true, onResolve above should handle it
      build.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, (args) => {
        // Only process server files (init.server.ts, config.server.ts) in the project root
        // App directory files are handled by onResolve when bundle: true
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
    },
  };
}

/**
 * Post-processes compiled .mjs files to rewrite path aliases to relative paths.
 * This is needed because when bundle: true, esbuild may not inline modules with
 * top-level await, leaving path aliases in the output that Node.js ESM can't resolve.
 * 
 * @param outDir - Output directory containing compiled .mjs files
 * @param projectRoot - Root directory of the project (for resolving aliases)
 * @param appDir - App directory (input directory that mirrors outDir structure)
 */
function rewritePathAliasesInOutput(
  outDir: string,
  projectRoot: string,
  appDir: string
): void {
  const aliases = loadAliasesFromTsconfig(projectRoot);

  // Helper to resolve alias path to actual file path in output directory
  function resolveAliasToOutputPath(aliasPath: string): string | null {
    // Check if the path starts with any alias
    for (const [aliasKey, aliasSourcePath] of Object.entries(aliases)) {
      if (aliasPath.startsWith(aliasKey + "/") || aliasPath === aliasKey) {
        // Extract the path after the alias
        const restPath = aliasPath.startsWith(aliasKey + "/")
          ? aliasPath.slice(aliasKey.length + 1)
          : "";
        
        // Resolve to absolute source path
        const resolvedSourcePath = restPath
          ? path.join(aliasSourcePath, restPath)
          : aliasSourcePath;

        // Find the actual source file (with extensions)
        let actualSourcePath: string | null = null;
        const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
        
        // Check if it's a directory with index file
        if (fs.existsSync(resolvedSourcePath) && fs.statSync(resolvedSourcePath).isDirectory()) {
          for (const ext of extensions) {
            const indexPath = path.join(resolvedSourcePath, `index${ext}`);
            if (fs.existsSync(indexPath)) {
              actualSourcePath = indexPath;
              break;
            }
          }
        } else {
          // Check if file exists with any extension
          for (const ext of extensions) {
            const filePath = resolvedSourcePath + ext;
            if (fs.existsSync(filePath)) {
              actualSourcePath = filePath;
              break;
            }
          }
          
          // If no extension match, check if the path itself exists
          if (!actualSourcePath && fs.existsSync(resolvedSourcePath)) {
            actualSourcePath = resolvedSourcePath;
          }
        }

        if (actualSourcePath) {
          // Calculate the relative path from appDir to the source file
          // The output directory structure mirrors the app directory structure
          const relativeFromApp = path.relative(appDir, actualSourcePath);
          
          // Convert to output path (mirrors app directory structure)
          const outputPath = path.join(outDir, relativeFromApp);
          
          // Find the actual compiled file (remove source extension and add .mjs)
          const pathWithoutExt = outputPath.replace(/\.(ts|tsx|js|jsx|json)$/, "");
          const compiledPath = pathWithoutExt + ".mjs";
          
          if (fs.existsSync(compiledPath)) {
            return compiledPath;
          }
        }
      }
    }

    return null;
  }

  function walkAndRewrite(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const full = path.join(dir, item.name);

      if (item.isDirectory()) {
        walkAndRewrite(full);
        continue;
      }

      if (item.isFile() && full.endsWith(".mjs")) {
        try {
          let content = fs.readFileSync(full, "utf-8");
          let modified = false;

          // Process each alias pattern (sort by length to handle longer aliases first)
          const aliasPatterns = Object.keys(aliases).sort((a, b) => b.length - a.length);
          
          for (const aliasKey of aliasPatterns) {
            // Escape special regex characters in alias
            const escapedAlias = aliasKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            
            // Pattern to match the alias in import statements
            // Matches: import ... from "@/lib/..." or await import("@/lib/...")
            // Handles single quotes, double quotes, and backticks
            const aliasInQuotesPattern = new RegExp(
              `(['"\`])${escapedAlias}(/[^'"\`\\s]*)?(['"\`])`,
              "g"
            );

            content = content.replace(aliasInQuotesPattern, (match, quote1, rest, quote2) => {
              const fullAliasPath = aliasKey + (rest || "");
              const resolvedOutputPath = resolveAliasToOutputPath(fullAliasPath);
              
              if (resolvedOutputPath && fs.existsSync(resolvedOutputPath)) {
                // Calculate relative path from current file to target file
                const relativePath = path.relative(path.dirname(full), resolvedOutputPath);
                
                // Normalize to use forward slashes (works on Windows too)
                let normalizedPath = relativePath.replace(/\\/g, "/");
                
                // Ensure it starts with ./ for relative imports
                if (!normalizedPath.startsWith(".")) {
                  normalizedPath = `./${normalizedPath}`;
                }
                
                // Remove .mjs extension for ESM imports (Node.js will resolve it)
                const pathWithoutExt = normalizedPath.replace(/\.mjs$/, "");
                
                modified = true;
                return `${quote1}${pathWithoutExt}${quote2}`;
              }
              
              return match;
            });
          }

          if (modified) {
            fs.writeFileSync(full, content, "utf-8");
          }
        } catch (error) {
          // Log but don't fail the build if we can't rewrite a file
          console.warn(`[framework] Warning: Could not rewrite path aliases in ${full}:`, error instanceof Error ? error.message : String(error));
        }
      }
    }
  }

  walkAndRewrite(outDir);
}

/**
 * Copies static files (JSON, txt, etc.) from app directory to output directory.
 * This ensures files referenced via import.meta.url are available at runtime.
 * 
 * @param appDir - App directory to copy from
 * @param outDir - Output directory to copy to
 */
function copyStaticFilesFromApp(appDir: string, outDir: string): void {
  if (!fs.existsSync(appDir)) return;

  const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".d.ts", ".map"];

  function walk(srcDir: string, destDir: string): void {
    if (!fs.existsSync(srcDir)) return;

    const items = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const item of items) {
      const srcPath = path.join(srcDir, item.name);
      const destPath = path.join(destDir, item.name);

      if (item.isDirectory()) {
        // Skip node_modules and other common directories
        if (item.name === "node_modules" || item.name.startsWith(".")) {
          continue;
        }
        ensureDir(destPath);
        walk(srcPath, destPath);
        continue;
      }

      if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        
        if (!sourceExtensions.includes(ext)) {
          ensureDir(destDir);
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
  }

  walk(appDir, outDir);
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
  appDir: string,
  config?: FrameworkConfig
): Promise<BuildServerResult> {
  const outDir = path.join(projectRoot, BUILD_FOLDER_NAME, "server");

  const entryPoints = collectAppSources(appDir);
  ensureDir(outDir);

  if (entryPoints.length === 0) {
    return { outDir };
  }

  // Create path alias plugin for app files and server files
  const pathAliasPlugin = createPathAliasPlugin(projectRoot, outDir);

  await esbuild.build({
    entryPoints,
    outdir: outDir,
    outbase: appDir,
    platform: "node",
    format: "esm",
    target: "node18",
    jsx: "automatic",
    sourcemap: true,
    bundle: true,
    splitting: false,
    logLevel: "info",
    tsconfig: path.join(projectRoot, "tsconfig.json"),
    packages: "external",
    outExtension: { ".js": ".mjs" },
    plugins: [pathAliasPlugin], // Add path alias plugin to resolve @/ imports
  });

  // Copy static files (JSON, txt, etc.) to output directory
  // This ensures files referenced via import.meta.url are available at runtime
  copyStaticFilesFromApp(appDir, outDir);

  // Post-process compiled files to rewrite path aliases to relative paths
  // This is necessary because esbuild may not inline modules with top-level await,
  // leaving path aliases in the output that Node.js ESM can't resolve at runtime
  rewritePathAliasesInOutput(outDir, projectRoot, appDir);

  for (const fileName of SERVER_FILES) {
    const initTS = path.join(projectRoot, `${fileName}.ts`);

    if (fs.existsSync(initTS)) {
      const initJSWithExt = path.join(outDir, `${fileName}.mjs`);
      
      await esbuild.build({
        entryPoints: [initTS],
        outfile: initJSWithExt,
        platform: "node",
        format: "esm",
        target: "node18",
        jsx: "automatic",
        sourcemap: true,
        bundle: false,
        logLevel: "info",
        tsconfig: path.join(projectRoot, "tsconfig.json"),
        plugins: [pathAliasPlugin],
        outExtension: { ".js": ".mjs" },
      });
    }
  }

  return { outDir };
}
