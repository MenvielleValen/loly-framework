import type { LoaderContext } from "@rspack/core";
import path from "path";
import { getClientComponents, isClientComponentFile } from "../utils/detect-client-components";

/**
 * Rspack loader that replaces client components with placeholders.
 * 
 * This loader is applied to all .tsx/.ts/.jsx/.js files and checks if they are client components.
 * If they are, it replaces the entire file content with a placeholder component.
 */
export default function excludeClientComponentsLoader(
  this: LoaderContext,
  source: string
): string {
  // Get the resource path
  const resourcePath = this.resourcePath;
  
  // Skip node_modules
  if (resourcePath.includes("node_modules")) {
    return source;
  }
  
  // Get registered client components
  const registeredComponents = getClientComponents();
  const clientComponents = new Set(
    registeredComponents.map(p => path.normalize(p).replace(/\\/g, "/"))
  );
  
  // Normalize path for comparison
  const normalizedPath = path.normalize(resourcePath).replace(/\\/g, "/");
  
  // Check if this is a client component
  let isClientComponent = clientComponents.has(normalizedPath);
  if (!isClientComponent) {
    try {
      isClientComponent = isClientComponentFile(resourcePath);
    } catch {
      isClientComponent = false;
    }
  }
  
  if (!isClientComponent) {
    return source; // Not a client component, return original source
  }
  
  // Get project root from loader context (we'll pass it via options)
  const projectRoot = (this as any).query?.projectRoot || process.cwd();
  const relativePath = path.relative(projectRoot, resourcePath).replace(/\\/g, "/");
  
  // Extract component name
  const fileName = path.basename(resourcePath, path.extname(resourcePath));
  const componentName = fileName || "Component";
  
  // Extract named exports
  const namedExports: string[] = [];
  try {
    // Pattern 1: export function ComponentName
    const functionPattern = /export\s+(?:async\s+)?function\s+(\w+)/g;
    let match;
    while ((match = functionPattern.exec(source)) !== null) {
      namedExports.push(match[1]);
    }
    
    // Pattern 2: export const ComponentName =
    const constPattern = /export\s+const\s+(\w+)\s*=/g;
    while ((match = constPattern.exec(source)) !== null) {
      namedExports.push(match[1]);
    }
    
    // Pattern 3: export class ComponentName
    const classPattern = /export\s+class\s+(\w+)/g;
    while ((match = classPattern.exec(source)) !== null) {
      namedExports.push(match[1]);
    }
    
    // Pattern 4: export { A, B, C } or export { A as B }
    const namedExportPattern = /export\s+{\s*([^}]+)\s*}/g;
    while ((match = namedExportPattern.exec(source)) !== null) {
      const exports = match[1].split(',').map(e => {
        const trimmed = e.trim();
        const parts = trimmed.split(/\s+as\s+/);
        return parts[parts.length - 1].trim();
      });
      namedExports.push(...exports);
    }
  } catch {
    // If we can't parse, continue with empty named exports
  }
  
  // Remove duplicates and filter
  const uniqueNamedExports = [...new Set(namedExports)].filter(name => 
    name && name !== 'default' && name !== '__clientComponentPlaceholder'
  );
  
  // Generate placeholder code (same as esbuild plugin)
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

  const namedExportsCode = uniqueNamedExports.length > 0
    ? uniqueNamedExports.map(name => 
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

