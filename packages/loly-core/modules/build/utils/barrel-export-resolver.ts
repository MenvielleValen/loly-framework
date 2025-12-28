import fs from "fs";
import path from "path";
import { extractImports, resolveImportPath, type ImportStatement } from "./import-extractor";
import { isClientComponentFile } from "./detect-client-components";

/**
 * Represents a re-export found in a barrel file.
 */
export interface ReExport {
  /**
   * The path being re-exported
   */
  exportPath: string;
  
  /**
   * Resolved absolute path to the re-exported file
   */
  resolvedPath: string | null;
  
  /**
   * Whether the re-exported file is a client component
   */
  isClientComponent: boolean;
  
  /**
   * Named exports being re-exported (if specific)
   */
  namedExports?: string[];
  
  /**
   * Whether this is a default export re-export
   */
  isDefault?: boolean;
}

/**
 * Checks if a file is a barrel export file (index.ts, index.tsx, etc.).
 * 
 * @param filePath - Path to check
 * @returns True if the file is likely a barrel export
 */
export function isBarrelExportFile(filePath: string): boolean {
  const basename = path.basename(filePath, path.extname(filePath));
  return basename === "index";
}

/**
 * Extracts re-exports from a barrel export file.
 * 
 * Detects patterns like:
 * - export { something } from "./file"
 * - export * from "./file"
 * - export { default } from "./file"
 * - export Component from "./Component"
 * 
 * @param filePath - Path to the barrel export file
 * @param projectRoot - Root directory of the project (for resolving paths)
 * @returns Array of re-exports found
 */
export function extractReExports(
  filePath: string,
  projectRoot?: string
): ReExport[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const reExports: ReExport[] = [];
    
    // Pattern 1: export { name1, name2 } from "path"
    const namedReExportPattern = /^export\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/gm;
    
    // Pattern 2: export * from "path"
    const starReExportPattern = /^export\s+\*\s+from\s+["']([^"']+)["'];?/gm;
    
    // Pattern 3: export { default } from "path"
    const defaultReExportPattern = /^export\s+\{\s*default\s*\}\s+from\s+["']([^"']+)["'];?/gm;
    
    // Pattern 4: export { default as Name } from "path"
    const defaultAsReExportPattern = /^export\s+\{\s*default\s+as\s+(\w+)\s*\}\s+from\s+["']([^"']+)["'];?/gm;
    
    // Pattern 5: export Component from "./Component" (default export)
    const defaultExportPattern = /^export\s+(\w+)\s+from\s+["']([^"']+)["'];?/gm;
    
    let match: RegExpExecArray | null;
    const lines = content.split("\n");
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip comments
      if (line.trim().startsWith("//") || line.trim().startsWith("/*")) {
        continue;
      }
      
      // Check for named re-export
      match = namedReExportPattern.exec(line);
      if (match) {
        const namedList = match[1]
          .split(",")
          .map(s => {
            // Handle "name as alias" syntax
            const parts = s.trim().split(/\s+as\s+/);
            return parts[parts.length - 1].trim();
          });
        const exportPath = match[2].trim();
        const resolved = resolveImportPath(exportPath, filePath, projectRoot);
        
        reExports.push({
          exportPath,
          resolvedPath: resolved,
          isClientComponent: resolved ? isClientComponentFile(resolved) : false,
          namedExports: namedList,
        });
        continue;
      }
      
      namedReExportPattern.lastIndex = 0;
      
      // Check for star re-export (export * from)
      match = starReExportPattern.exec(line);
      if (match) {
        const exportPath = match[1].trim();
        const resolved = resolveImportPath(exportPath, filePath, projectRoot);
        
        reExports.push({
          exportPath,
          resolvedPath: resolved,
          isClientComponent: resolved ? isClientComponentFile(resolved) : false,
        });
        continue;
      }
      
      starReExportPattern.lastIndex = 0;
      
      // Check for default re-export (export { default } from)
      match = defaultReExportPattern.exec(line);
      if (match) {
        const exportPath = match[1].trim();
        const resolved = resolveImportPath(exportPath, filePath, projectRoot);
        
        reExports.push({
          exportPath,
          resolvedPath: resolved,
          isClientComponent: resolved ? isClientComponentFile(resolved) : false,
          isDefault: true,
        });
        continue;
      }
      
      defaultReExportPattern.lastIndex = 0;
      
      // Check for default as re-export (export { default as Name } from)
      match = defaultAsReExportPattern.exec(line);
      if (match) {
        const exportPath = match[2].trim();
        const resolved = resolveImportPath(exportPath, filePath, projectRoot);
        
        reExports.push({
          exportPath,
          resolvedPath: resolved,
          isClientComponent: resolved ? isClientComponentFile(resolved) : false,
          isDefault: true,
          namedExports: [match[1].trim()],
        });
        continue;
      }
      
      defaultAsReExportPattern.lastIndex = 0;
      
      // Check for default export (export Name from)
      match = defaultExportPattern.exec(line);
      if (match) {
        const exportPath = match[2].trim();
        const resolved = resolveImportPath(exportPath, filePath, projectRoot);
        
        reExports.push({
          exportPath,
          resolvedPath: resolved,
          isClientComponent: resolved ? isClientComponentFile(resolved) : false,
          isDefault: true,
          namedExports: [match[1].trim()],
        });
        continue;
      }
      
      defaultExportPattern.lastIndex = 0;
    }
    
    return reExports;
  } catch (error) {
    console.warn(`[dependency-analysis] Failed to extract re-exports from ${filePath}:`, error);
    return [];
  }
}

/**
 * Follows a barrel export to find all client components being re-exported.
 * 
 * @param barrelFilePath - Path to the barrel export file
 * @param projectRoot - Root directory of the project
 * @returns Array of absolute paths to client components being re-exported
 */
export function followBarrelExport(
  barrelFilePath: string,
  projectRoot?: string
): string[] {
  if (!fs.existsSync(barrelFilePath)) {
    return [];
  }
  
  const reExports = extractReExports(barrelFilePath, projectRoot);
  const clientComponents: string[] = [];
  
  for (const reExport of reExports) {
    if (reExport.resolvedPath && reExport.isClientComponent) {
      clientComponents.push(reExport.resolvedPath);
    }
    
    // If the re-exported file is also a barrel export, follow it recursively
    if (reExport.resolvedPath && isBarrelExportFile(reExport.resolvedPath)) {
      clientComponents.push(...followBarrelExport(reExport.resolvedPath, projectRoot));
    }
  }
  
  return [...new Set(clientComponents)]; // Remove duplicates
}

/**
 * Resolves an import that might be a barrel export to actual client components.
 * 
 * @param importPath - The import path
 * @param fromFile - The file where the import is located
 * @param projectRoot - Root directory of the project
 * @returns Array of absolute paths to client components, or empty if not a barrel export or no client components
 */
export function resolveBarrelImportToClientComponents(
  importPath: string,
  fromFile: string,
  projectRoot?: string
): string[] {
  const resolved = resolveImportPath(importPath, fromFile, projectRoot);
  
  if (!resolved || !fs.existsSync(resolved)) {
    return [];
  }
  
  // Check if it's a barrel export
  if (isBarrelExportFile(resolved)) {
    return followBarrelExport(resolved, projectRoot);
  }
  
  // If it's a direct import of a client component
  if (isClientComponentFile(resolved)) {
    return [resolved];
  }
  
  return [];
}

