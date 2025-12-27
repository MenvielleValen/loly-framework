import fs from "fs";
import path from "path";

/**
 * Checks if a file contains the "use client" directive.
 * 
 * @param filePath - Path to the file to check
 * @returns `true` if the file contains "use client", `false` otherwise
 */
export function hasClientDirective(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    // Check for "use client" at the top of the file (before any imports or code)
    // It can be with or without quotes, and may have whitespace
    const lines = content.split("\n");
    
    // Check first 10 lines for "use client" directive
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      // Match "use client" with optional quotes and whitespace
      if (/^["']?use\s+client["']?\s*;?\s*$/.test(line)) {
        return true;
      }
      // Stop checking if we hit a non-comment, non-empty line that's not "use client"
      if (line && !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*")) {
        break;
      }
    }
    
    return false;
  } catch (error) {
    // If we can't read the file, assume it's not a client component
    return false;
  }
}

/**
 * Registry of client component file paths.
 * Used to track which components should not be rendered on the server.
 */
const clientComponentRegistry = new Set<string>();

/**
 * Registers a file as a client component.
 * 
 * @param filePath - Absolute or relative path to the component file
 */
export function registerClientComponent(filePath: string): void {
  const normalizedPath = path.normalize(filePath);
  clientComponentRegistry.add(normalizedPath);
}

/**
 * Checks if a file is registered as a client component.
 * 
 * @param filePath - Absolute or relative path to the component file
 * @returns `true` if the file is registered as a client component
 */
export function isClientComponent(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  return clientComponentRegistry.has(normalizedPath);
}

/**
 * Scans a directory and registers all files with "use client" directive.
 * 
 * @param dirPath - Directory to scan
 * @param extensions - File extensions to check (default: [".tsx", ".ts", ".jsx", ".js"])
 */
export function scanAndRegisterClientComponents(
  dirPath: string,
  extensions: string[] = [".tsx", ".ts", ".jsx", ".js"]
): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and build directories
        if (entry.name === "node_modules" || entry.name === ".loly" || entry.name.startsWith(".")) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          if (hasClientDirective(fullPath)) {
            registerClientComponent(fullPath);
          }
        }
      }
    }
  }

  walk(dirPath);
}

/**
 * Gets all registered client component paths.
 * 
 * @returns Array of registered client component file paths
 */
export function getClientComponents(): string[] {
  return Array.from(clientComponentRegistry);
}

/**
 * Clears the client component registry.
 * Useful for testing or when rebuilding.
 */
export function clearClientComponentRegistry(): void {
  clientComponentRegistry.clear();
}

