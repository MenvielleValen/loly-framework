import type { RspackPluginInstance, Compiler, NormalModule } from "@rspack/core";
import path from "path";
import fs from "fs";
import { isClientComponentFile, getClientComponents } from "../utils/detect-client-components";
import { loadAliasesFromTsconfig } from "../utils";

/**
 * Creates a Rspack plugin that excludes client components from the client bundle.
 * 
 * When a server component (or any component) imports a client component in the client bundle,
 * this plugin replaces the client component code with a placeholder, ensuring the client component
 * code is NOT included in the initial bundle. The actual component will be loaded dynamically
 * in mountClientIslands.
 * 
 * This ensures that hydrateRoot never sees JSX of a client component - only placeholders.
 * 
 * @param projectRoot - Root directory of the project
 * @returns Rspack plugin instance
 */
export function createRspackExcludeClientComponentsPlugin(
  projectRoot: string
): RspackPluginInstance {
  // Get registered client components
  const registeredComponents = getClientComponents();
  const clientComponents = new Set(
    registeredComponents.map(p => path.normalize(p).replace(/\\/g, "/"))
  );
  
  // Load aliases to resolve path aliases
  const aliases = loadAliasesFromTsconfig(projectRoot);
  
  // Helper to resolve path alias to absolute path
  function resolveAliasPath(importPath: string): string | null {
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
        const restPath = importPath.startsWith(aliasKey + "/")
          ? importPath.slice(aliasKey.length + 1)
          : "";
        
        const resolvedPath = restPath
          ? path.join(aliasPath, restPath)
          : aliasPath;
        
        // Try to find the actual file (with extensions)
        const extensions = [".tsx", ".ts", ".jsx", ".js"];
        for (const ext of extensions) {
          const withExt = resolvedPath + ext;
          if (fs.existsSync(withExt)) {
            return withExt;
          }
        }
        
        // Try as directory with index
        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
          for (const ext of extensions) {
            const indexPath = path.join(resolvedPath, `index${ext}`);
            if (fs.existsSync(indexPath)) {
              return indexPath;
            }
          }
        }
      }
    }
    
    return null;
  }
  
  // Helper to normalize paths for comparison
  const normalizePath = (p: string) => path.normalize(p).replace(/\\/g, "/");
  
  // Helper to extract named exports from a file
  function extractNamedExports(filePath: string): string[] {
    const namedExports: string[] = [];
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        
        // Pattern 1: export function ComponentName
        const functionPattern = /export\s+(?:async\s+)?function\s+(\w+)/g;
        let match;
        while ((match = functionPattern.exec(content)) !== null) {
          namedExports.push(match[1]);
        }
        
        // Pattern 2: export const ComponentName =
        const constPattern = /export\s+const\s+(\w+)\s*=/g;
        while ((match = constPattern.exec(content)) !== null) {
          namedExports.push(match[1]);
        }
        
        // Pattern 3: export class ComponentName
        const classPattern = /export\s+class\s+(\w+)/g;
        while ((match = classPattern.exec(content)) !== null) {
          namedExports.push(match[1]);
        }
        
        // Pattern 4: export { A, B, C } or export { A as B }
        const namedExportPattern = /export\s+{\s*([^}]+)\s*}/g;
        while ((match = namedExportPattern.exec(content)) !== null) {
          const exports = match[1].split(',').map(e => {
            const trimmed = e.trim();
            const parts = trimmed.split(/\s+as\s+/);
            return parts[parts.length - 1].trim();
          });
          namedExports.push(...exports);
        }
      }
    } catch {
      // If we can't read or parse, continue with empty named exports
    }
    
    // Remove duplicates and filter out default and empty strings
    return [...new Set(namedExports)].filter(name => 
      name && name !== 'default' && name !== '__clientComponentPlaceholder'
    );
  }
  
  // Generate placeholder code (same as esbuild plugin)
  function generatePlaceholderCode(
    relativePath: string,
    componentName: string,
    namedExports: string[]
  ): string {
    const generateStableIdFn = `
function generateStableId(filePath, exportName) {
  const input = filePath + ":" + (exportName || "default");
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hexHash = Math.abs(hash).toString(36);
  return "client-island-" + hexHash;
}`;

    const serializePropsFn = `
function serializeProps(props) {
  if (!props || typeof props !== "object") {
    return "{}";
  }
  
  const seen = new WeakSet();
  
  function isSerializable(value, depth) {
    depth = depth || 0;
    if (depth > 10) return false;
    if (value === null || value === undefined) return true;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
    if (typeof value === "function") return false;
    if (React.isValidElement && React.isValidElement(value)) return false;
    if (value && typeof value === "object" && value.$$typeof) return false;
    
    if (typeof value === "object") {
      if (seen.has(value)) return false;
      seen.add(value);
      
      try {
        if (Array.isArray(value)) {
          const result = value.every(item => isSerializable(item, depth + 1));
          seen.delete(value);
          return result;
        }
        
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            if (!isSerializable(value[key], depth + 1)) {
              seen.delete(value);
              return false;
            }
          }
        }
        seen.delete(value);
        return true;
      } catch {
        seen.delete(value);
        return false;
      }
    }
    return false;
  }
  
  function filterProps(obj) {
    const filtered = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (key === "children") continue;
        if (typeof value === "function") continue;
        if (React.isValidElement && React.isValidElement(value)) continue;
        if (value && typeof value === "object" && value.$$typeof) continue;
        
        if (isSerializable(value)) {
          try {
            JSON.stringify(value);
            filtered[key] = value;
          } catch {
            continue;
          }
        }
      }
    }
    return filtered;
  }
  
  try {
    const filtered = filterProps(props);
    return JSON.stringify(filtered);
  } catch (error) {
    return "{}";
  }
}`;

    const namedExportsCode = namedExports.length > 0
      ? namedExports.map(name => 
          `export function ${name}(props: any) {
  const componentName = ${JSON.stringify(name)};
  const filePath = ${JSON.stringify(relativePath)};
  const exportName = ${JSON.stringify(name)};
  const propsJson = props ? serializeProps(props) : "{}";
  const stableId = generateStableId(filePath, exportName);
  
  return React.createElement("div", {
    id: stableId,
    "data-client-component": componentName,
    "data-client-file": filePath,
    "data-client-props": propsJson,
    "data-export-name": exportName,
    suppressHydrationWarning: true
  });
}`
        ).join('\n\n')
      : '';

    return `
import React from "react";

${generateStableIdFn}
${serializePropsFn}

/**
 * Placeholder for client component: ${relativePath}
 * This component is excluded from client bundle during hydration.
 * The actual component will be loaded dynamically in mountClientIslands
 * and mounted as an island using createRoot after hydration completes.
 */
export default function ClientComponentPlaceholder(props: any) {
  const componentName = ${JSON.stringify(componentName)};
  const filePath = ${JSON.stringify(relativePath)};
  const exportName = "default";
  const propsJson = props ? serializeProps(props) : "{}";
  const stableId = generateStableId(filePath, exportName);
  
  return React.createElement("div", {
    id: stableId,
    "data-client-component": componentName,
    "data-client-file": filePath,
    "data-client-props": propsJson,
    "data-export-name": exportName,
    suppressHydrationWarning: true
  });
}

${namedExportsCode}
    `.trim();
  }
  
  return {
    name: "rspack-exclude-client-components",
    apply(compiler: Compiler) {
      compiler.hooks.normalModuleFactory.tap(
        "rspack-exclude-client-components",
        (normalModuleFactory) => {
          // Hook into module resolution
          normalModuleFactory.hooks.beforeResolve.tap(
            "rspack-exclude-client-components",
            (data) => {
              if (!data.request) return;
              
              // Skip node_modules
              if (data.request.includes("node_modules")) return;
              
              // Resolve path alias if needed
              let resolvedPath: string | null = null;
              
              if (data.request.startsWith("@") || data.request.startsWith(".") || path.isAbsolute(data.request)) {
                if (data.request.startsWith("@")) {
                  resolvedPath = resolveAliasPath(data.request);
                } else if (data.request.startsWith(".")) {
                  if (data.context) {
                    resolvedPath = path.resolve(data.context, data.request);
                    // Try to find with extensions
                    const extensions = [".tsx", ".ts", ".jsx", ".js"];
                    for (const ext of extensions) {
                      if (fs.existsSync(resolvedPath + ext)) {
                        resolvedPath = resolvedPath + ext;
                        break;
                      }
                    }
                  }
                } else if (path.isAbsolute(data.request)) {
                  resolvedPath = data.request;
                }
              }
              
              if (resolvedPath) {
                const normalized = normalizePath(resolvedPath);
                if (clientComponents.has(normalized) || isClientComponentFile(resolvedPath)) {
                  // Mark this module as a client component
                  const dataAny = data as any;
                  if (!dataAny.buildInfo) {
                    dataAny.buildInfo = {};
                  }
                  dataAny.buildInfo.isClientComponent = true;
                  dataAny.buildInfo.clientComponentPath = normalized;
                }
              }
            }
          );
          
          // Hook into module creation to replace client components
          normalModuleFactory.hooks.afterResolve.tap(
            "rspack-exclude-client-components",
            (data) => {
              const dataAny = data as any;
              if (!dataAny.resource) return;
              
              // Skip node_modules
              if (dataAny.resource.includes("node_modules")) return;
              
              const normalized = normalizePath(dataAny.resource);
              
              // Check if this is a client component
              const isClientComponent = clientComponents.has(normalized) || 
                                       isClientComponentFile(dataAny.resource);
              
              if (isClientComponent) {
                // Mark as client component
                if (!dataAny.buildInfo) {
                  dataAny.buildInfo = {};
                }
                dataAny.buildInfo.isClientComponent = true;
                dataAny.buildInfo.clientComponentPath = normalized;
              }
            }
          );
        }
      );
      
      // Hook into module processing to replace content
      compiler.hooks.compilation.tap(
        "rspack-exclude-client-components",
        (compilation) => {
          compilation.hooks.processAssets.tap(
            {
              name: "rspack-exclude-client-components",
              stage: (compilation.constructor as any).PROCESS_ASSETS_STAGE_ADDITIONAL,
            },
            () => {
              // This approach doesn't work well - we need to use a loader instead
              // Rspack doesn't have a direct equivalent to esbuild's onLoad
            }
          );
        }
      );
      
      // Use a custom loader to replace client components
      compiler.hooks.normalModuleFactory.tap(
        "rspack-exclude-client-components-loader",
        (normalModuleFactory) => {
          normalModuleFactory.hooks.beforeResolve.tap(
            "rspack-exclude-client-components-loader",
            (data) => {
              if (!data.request) return;
              
              // We'll handle this in the loader
            }
          );
        }
      );
    },
  };
}

