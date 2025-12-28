import type { Plugin } from "esbuild";
import path from "path";
import fs from "fs";
import { isClientComponentFile } from "../utils/detect-client-components";
import { loadAliasesFromTsconfig } from "../utils";

/**
 * Creates an esbuild plugin that excludes client components from the server bundle.
 * 
 * When a server component imports a client component, this plugin replaces
 * the client component code with a placeholder, ensuring the client component
 * code is NOT included in the server bundle.
 * 
 * @param projectRoot - Root directory of the project
 * @param clientComponents - Set of normalized absolute paths to client components
 * @returns esbuild plugin
 */
export function createExcludeClientComponentsPlugin(
  projectRoot: string,
  clientComponents: Set<string>
): Plugin {
  // Load aliases to resolve path aliases ourselves
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
  
  return {
    name: "exclude-client-components",
    setup(build) {
      // Track which files are client components during resolution
      const clientComponentFiles = new Set<string>();
      
      // Intercept module resolution to mark client components
      // We need to intercept path aliases BEFORE they're resolved by pathAliasPlugin
      // Also intercept absolute paths that might be already resolved
      build.onResolve({ filter: /.*/ }, (args) => {
        // Skip node_modules
        if (args.path.includes("node_modules")) {
          return;
        }
        
        // Only process paths that are:
        // 1. Path aliases (start with @)
        // 2. Relative paths (start with .)
        // 3. Absolute paths (already resolved)
        if (!args.path.startsWith("@") && !args.path.startsWith(".") && !path.isAbsolute(args.path)) {
          // Skip other imports (let other plugins handle them)
          return;
        }
        
        // Handle entry points (no importer) - check if they are client components
        if (!args.importer) {
          const normalizedPath = path.normalize(args.path);
          if (clientComponents.has(normalizedPath) || isClientComponentFile(normalizedPath)) {
            return {
              path: normalizedPath,
              pluginData: { shouldReplace: true, isEntryPoint: true },
            };
          }
          return; // Let esbuild handle non-client-component entry points
        }
        
        // Check if the importer is a client component
        const importerNormalized = path.normalize(args.importer);
        const isImporterClientComponent = clientComponents.has(importerNormalized) || 
                                          isClientComponentFile(importerNormalized);
        
        // Resolve the import path
        let resolvedPath: string | null = null;
        try {
          if (path.isAbsolute(args.path)) {
            resolvedPath = args.path;
          } else if (args.path.startsWith(".") || args.path.startsWith("/")) {
            resolvedPath = path.resolve(
              path.dirname(args.importer),
              args.path
            );
          } else {
            // Could be a path alias - try to resolve it
            const aliasResolved = resolveAliasPath(args.path);
            if (aliasResolved) {
              resolvedPath = aliasResolved;
            } else {
              // External module (node_modules), skip
              return;
            }
          }
          
          // If resolvedPath already has extension (from resolveAliasPath), use it directly
          // Otherwise, try to resolve with extensions
          if (resolvedPath && path.extname(resolvedPath)) {
            // Already has extension, use it
            const normalizedPath = path.normalize(resolvedPath);
            
            // Check if this is a client component
            if (clientComponents.has(normalizedPath) || isClientComponentFile(normalizedPath)) {
              clientComponentFiles.add(normalizedPath);
              
              // If importer is NOT a client component, mark this for replacement
              if (!isImporterClientComponent) {
                return {
                  path: normalizedPath,
                  pluginData: { shouldReplace: true },
                };
              }
            }
            return; // Let esbuild handle it normally
          }
          
          // Try to resolve with extensions
          const extensions = [".tsx", ".ts", ".jsx", ".js"];
          let actualPath: string | null = null;
          
          if (resolvedPath && fs.existsSync(resolvedPath)) {
            const stat = fs.statSync(resolvedPath);
            if (stat.isDirectory()) {
              // Try index files
              for (const ext of extensions) {
                const indexPath = path.join(resolvedPath, `index${ext}`);
                if (fs.existsSync(indexPath)) {
                  actualPath = indexPath;
                  break;
                }
              }
            } else {
              actualPath = resolvedPath;
            }
          } else if (resolvedPath) {
            // Try with extensions
            for (const ext of extensions) {
              const withExt = resolvedPath + ext;
              if (fs.existsSync(withExt)) {
                actualPath = withExt;
                break;
              }
            }
          }
          
          if (!actualPath) {
            return; // Could not resolve
          }
          
          const normalizedPath = path.normalize(actualPath);
          
          // Check if this is a client component
          if (clientComponents.has(normalizedPath) || isClientComponentFile(normalizedPath)) {
            clientComponentFiles.add(normalizedPath);
            
            // If importer is NOT a client component, mark this for replacement
            if (!isImporterClientComponent) {
              return {
                path: normalizedPath,
                pluginData: { shouldReplace: true },
              };
            }
          }
        } catch {
          // If resolution fails, let esbuild handle it
          return;
        }
      });
      
      // Intercept module loading to replace client components with placeholders
      // This runs for every file that esbuild loads, so we can reliably check here
      build.onLoad({ filter: /\.(tsx?|jsx?)$/ }, async (args) => {
        const normalizedPath = path.normalize(args.path);
        
        // Check if this is a client component
        const isClientComponent = clientComponents.has(normalizedPath) || 
                                 isClientComponentFile(normalizedPath);
        
        if (isClientComponent) {
          // Always replace client components in server bundle
          // The pluginData check is just an optimization, but we verify directly here
          const shouldReplace = args.pluginData?.shouldReplace !== false;
          
          if (shouldReplace) {
            // Get relative path for the placeholder
            const relativePath = path.relative(projectRoot, normalizedPath);
            
            // Try to extract named exports from the original file
            let namedExports: string[] = [];
            try {
              if (fs.existsSync(normalizedPath)) {
                const content = fs.readFileSync(normalizedPath, "utf-8");
                // Extract named exports using regex
                // Match: export function ComponentName, export const ComponentName, export class ComponentName
                
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
                    // Handle "A as B" syntax
                    const parts = trimmed.split(/\s+as\s+/);
                    return parts[parts.length - 1].trim();
                  });
                  namedExports.push(...exports);
                }
              }
            } catch (error) {
              // If we can't read or parse, continue with empty named exports
              // This is not critical - the build will fail if exports are missing
            }
            
            // Remove duplicates and filter out default and empty strings
            namedExports = [...new Set(namedExports)].filter(name => 
              name && name !== 'default' && name !== '__clientComponentPlaceholder'
            );
            
            // Extract component name from file path (matches ClientComponentPlaceholder behavior)
            const fileName = path.basename(normalizedPath, path.extname(normalizedPath));
            const componentName = fileName || "Component";
            
            // Helper function to generate deterministic ID (matches ClientComponentPlaceholder)
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
            
            // Generate placeholder code with named exports
            // IMPORTANT: Placeholders are React elements that will be mounted as islands
            // using createRoot after the main tree hydration completes.
            // Format must match ClientComponentPlaceholder exactly:
            // - id: stable deterministic ID
            // - data-client-component: componentName
            // - data-client-file: filePath
            // - data-client-props: serialized props
            // - data-export-name: exportName
            // NO display: contents, NO suppressHydrationWarning
            // Helper function to safely serialize props (same logic as ClientComponentPlaceholder)
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
  
  // Placeholder for client component - will be mounted with createRoot
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
            
            return {
              contents: `
import React from "react";

${generateStableIdFn}
${serializePropsFn}

/**
 * Placeholder for client component: ${relativePath}
 * This component is excluded from server bundle.
 * The actual component will be loaded from the client bundle and mounted
 * as an island using createRoot after the main tree hydration completes.
 * 
 * IMPORTANT: This placeholder must return the same structure on both
 * server and client. It will be mounted as an island, not hydrated.
 * 
 * Format matches ClientComponentPlaceholder:
 * - id: stable deterministic ID
 * - data-client-component: componentName
 * - data-client-file: filePath
 * - data-client-props: serialized props
 * - data-export-name: exportName (default: "default")
 */
export default function ClientComponentPlaceholder(props: any) {
  const componentName = ${JSON.stringify(componentName)};
  const filePath = ${JSON.stringify(relativePath)};
  const exportName = "default";
  const propsJson = props ? serializeProps(props) : "{}";
  const stableId = generateStableId(filePath, exportName);
  
  // Placeholder for client component - will be mounted with createRoot
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
            `,
              loader: "tsx",
            };
          }
        }
      });
    },
  };
}

