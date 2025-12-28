import fs from "fs";
import path from "path";

/**
 * Represents an import statement extracted from source code.
 */
export interface ImportStatement {
  /**
   * The import path (e.g., "./Component", "@/components/Button", "react")
   */
  importPath: string;
  
  /**
   * Type of import: "default", "named", "namespace", or "side-effect"
   */
  type: "default" | "named" | "namespace" | "side-effect";
  
  /**
   * Named imports (for type: "named")
   */
  namedImports?: string[];
  
  /**
   * Default import name (for type: "default")
   */
  defaultImport?: string;
  
  /**
   * Namespace import name (for type: "namespace")
   */
  namespaceImport?: string;
  
  /**
   * Line number where the import was found (for debugging)
   */
  line?: number;
}

/**
 * Extracts import statements from a TypeScript/JavaScript file.
 * 
 * Uses regex-based parsing (simple and fast) to extract static imports.
 * Does not handle dynamic imports (import()) - those require runtime analysis.
 * 
 * @param filePath - Path to the file to analyze
 * @returns Array of import statements found in the file
 * 
 * @example
 * ```tsx
 * // File content:
 * import React from "react";
 * import { useState, useEffect } from "react";
 * import * as utils from "./utils";
 * import "./styles.css";
 * 
 * // Returns:
 * [
 *   { importPath: "react", type: "default", defaultImport: "React" },
 *   { importPath: "react", type: "named", namedImports: ["useState", "useEffect"] },
 *   { importPath: "./utils", type: "namespace", namespaceImport: "utils" },
 *   { importPath: "./styles.css", type: "side-effect" }
 * ]
 * ```
 */
export function extractImports(filePath: string): ImportStatement[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const imports: ImportStatement[] = [];
    
    // Regex patterns for different import types
    // Pattern 1: import defaultExport from "path"
    const defaultImportPattern = /^import\s+(\w+)\s+from\s+["']([^"']+)["'];?/gm;
    
    // Pattern 2: import { named1, named2 } from "path"
    const namedImportPattern = /^import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/gm;
    
    // Pattern 3: import * as namespace from "path"
    const namespaceImportPattern = /^import\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["'];?/gm;
    
    // Pattern 4: import "path" (side-effect)
    const sideEffectImportPattern = /^import\s+["']([^"']+)["'];?/gm;
    
    // Pattern 5: import defaultExport, { named } from "path" (mixed)
    const mixedImportPattern = /^import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/gm;
    
    let match: RegExpExecArray | null;
    let lineNumber = 1;
    const lines = content.split("\n");
    
    // Track processed lines to avoid duplicates
    const processedLines = new Set<number>();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      lineNumber = i + 1;
      
      // Skip comments
      if (line.trim().startsWith("//") || line.trim().startsWith("/*")) {
        continue;
      }
      
      // Check for mixed import (default + named)
      match = mixedImportPattern.exec(line);
      if (match && !processedLines.has(lineNumber)) {
        processedLines.add(lineNumber);
        const defaultName = match[1].trim();
        const namedList = match[2].split(",").map(s => s.trim());
        const importPath = match[3].trim();
        
        imports.push({
          importPath,
          type: "default",
          defaultImport: defaultName,
          namedImports: namedList,
          line: lineNumber,
        });
        continue;
      }
      
      // Reset regex lastIndex for next pattern
      mixedImportPattern.lastIndex = 0;
      
      // Check for default import
      match = defaultImportPattern.exec(line);
      if (match && !processedLines.has(lineNumber)) {
        processedLines.add(lineNumber);
        imports.push({
          importPath: match[2].trim(),
          type: "default",
          defaultImport: match[1].trim(),
          line: lineNumber,
        });
        continue;
      }
      
      defaultImportPattern.lastIndex = 0;
      
      // Check for named import
      // Reset lastIndex before testing (important for global regex)
      namedImportPattern.lastIndex = 0;
      match = namedImportPattern.exec(line);
      if (match && !processedLines.has(lineNumber)) {
        processedLines.add(lineNumber);
        const namedList = match[1]
          .split(",")
          .map(s => {
            // Handle "name as alias" syntax
            const parts = s.trim().split(/\s+as\s+/);
            return parts[parts.length - 1].trim();
          });
        
        imports.push({
          importPath: match[2].trim(),
          type: "named",
          namedImports: namedList,
          line: lineNumber,
        });
        continue;
      }
      
      namedImportPattern.lastIndex = 0;
      
      // Check for namespace import
      match = namespaceImportPattern.exec(line);
      if (match && !processedLines.has(lineNumber)) {
        processedLines.add(lineNumber);
        imports.push({
          importPath: match[2].trim(),
          type: "namespace",
          namespaceImport: match[1].trim(),
          line: lineNumber,
        });
        continue;
      }
      
      namespaceImportPattern.lastIndex = 0;
      
      // Check for side-effect import
      match = sideEffectImportPattern.exec(line);
      if (match && !processedLines.has(lineNumber)) {
        processedLines.add(lineNumber);
        imports.push({
          importPath: match[1].trim(),
          type: "side-effect",
          line: lineNumber,
        });
        continue;
      }
      
      sideEffectImportPattern.lastIndex = 0;
    }
    
    return imports;
  } catch (error) {
    console.warn(`[dependency-analysis] Failed to extract imports from ${filePath}:`, error);
    return [];
  }
}

/**
 * Resolves an import path to an absolute file path.
 * 
 * Handles:
 * - Relative paths (./Component, ../utils)
 * - Absolute paths (/components/Button)
 * - Path aliases (@/components, @app/...)
 * - Node modules (react, lodash, etc.)
 * 
 * @param importPath - The import path from the import statement
 * @param fromFile - The file where the import is located
 * @param projectRoot - Root directory of the project (for resolving aliases)
 * @returns Absolute path to the imported file, or null if not found
 */
export function resolveImportPath(
  importPath: string,
  fromFile: string,
  projectRoot?: string
): string | null {
  // Skip node_modules and built-in modules
  if (!importPath.startsWith(".") && !importPath.startsWith("/") && !importPath.startsWith("@")) {
    return null; // External dependency, skip
  }
  
  const fromDir = path.dirname(fromFile);
  
  // Handle relative paths
  if (importPath.startsWith(".")) {
    const resolved = path.resolve(fromDir, importPath);
    
    // Try with different extensions
    const extensions = [".tsx", ".ts", ".jsx", ".js", ".json"];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt)) {
        return withExt;
      }
    }
    
    // Try as directory with index file
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      for (const ext of extensions) {
        const indexPath = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
    }
    
    // Return even if not found (might be created later)
    return resolved;
  }
  
  // Handle absolute paths (starting with /)
  if (importPath.startsWith("/")) {
    if (!projectRoot) {
      return null;
    }
    const resolved = path.join(projectRoot, importPath);
    
    const extensions = [".tsx", ".ts", ".jsx", ".js", ".json"];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt)) {
        return withExt;
      }
    }
    
    return resolved;
  }
  
  // Handle path aliases (@/components, @app/...)
  if (importPath.startsWith("@") && projectRoot) {
    // Load aliases from tsconfig
    const { loadAliasesFromTsconfig } = require("./index");
    const aliases = loadAliasesFromTsconfig(projectRoot);
    
    // Find matching alias
    for (const [aliasKey, aliasPath] of Object.entries(aliases)) {
      const checkWithSlash = aliasKey + "/";
      const matches = importPath.startsWith(checkWithSlash) || importPath === aliasKey;
      
      if (matches) {
        const restPath = importPath.startsWith(checkWithSlash)
          ? importPath.slice(checkWithSlash.length)
          : "";
        
        const resolved = restPath
          ? path.join(aliasPath, restPath)
          : aliasPath;
        
        // Try with extensions
        const extensions = [".tsx", ".ts", ".jsx", ".js", ".json"];
        for (const ext of extensions) {
          const withExt = resolved + ext;
          if (fs.existsSync(withExt)) {
            return withExt;
          }
        }
        
        // Try as directory
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          for (const ext of extensions) {
            const indexPath = path.join(resolved, `index${ext}`);
            if (fs.existsSync(indexPath)) {
              return indexPath;
            }
          }
        }
        
        return resolved;
      }
    }
  }
  
  return null;
}

/**
 * Filters imports to only include local files (not node_modules).
 * 
 * @param imports - Array of import statements
 * @param fromFile - The file where imports are located
 * @param projectRoot - Root directory of the project
 * @returns Filtered imports that are local files
 */
export function filterLocalImports(
  imports: ImportStatement[],
  fromFile: string,
  projectRoot?: string
): ImportStatement[] {
  return imports.filter(imp => {
    const resolved = resolveImportPath(imp.importPath, fromFile, projectRoot);
    return resolved !== null;
  });
}

